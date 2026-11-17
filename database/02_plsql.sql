/* =============================================================================
   ROTAS ACESSÍVEIS SP — Global Solution 2 (CitizenTech)
   Script 02 — PL/SQL: pacote de regras de negócio, triggers, views e job
   Pré-requisito: 01_ddl.sql
   ============================================================================= */

SET SERVEROUTPUT ON;

/* =============================================================================
   PACOTE PKG_ROTAS_ACESSIVEIS — especificação
   As regras são as mesmas do aplicativo (src/utils/scoring.ts e
   src/context/AppDataContext.tsx), para o banco e o app darem o mesmo resultado.
   ============================================================================= */
CREATE OR REPLACE PACKAGE pkg_rotas_acessiveis AS

  -- Parâmetros de negócio
  c_min_votos_resolucao CONSTANT PLS_INTEGER := 3;    -- votos para encerrar coletivamente
  c_peso_metro          CONSTANT NUMBER      := 300;  -- trecho de metrô pesa como 300 m de caminhada
  c_nota_critica        CONSTANT NUMBER      := 45;   -- abaixo disso o trecho é crítico

  /* Resultados devolvidos pelas procedures de voto:
       'REGISTRADO'   voto gravado
       'ENCERRADO'    voto gravado e alerta encerrado como resolvido
       'JA_VOTOU'     o cidadão já votou neste alerta
       'INDISPONIVEL' alerta inexistente ou já resolvido                       */

  /* ------------------------------ Funções -------------------------------- */

  -- 'DIA' (06h–17h59) ou 'NOITE' (18h–05h59), no horário de São Paulo.
  FUNCTION fn_periodo_atual RETURN VARCHAR2;

  -- Confiança bayesiana (Laplace) do alerta: (confirmações + 1) / (confirmações + resolvidos + 2).
  FUNCTION fn_confianca (
    p_confirmacoes     IN NUMBER,
    p_votos_resolvido  IN NUMBER
  ) RETURN NUMBER DETERMINISTIC;

  -- Relevância 0–100: peso da gravidade x atualidade x confiança + bônus por confirmações.
  FUNCTION fn_calc_relevancia (
    p_cd_gravidade           IN VARCHAR2,
    p_confirmacoes           IN NUMBER,
    p_votos_resolvido        IN NUMBER,
    p_dt_ultima_confirmacao  IN DATE,
    p_st_alerta              IN VARCHAR2
  ) RETURN NUMBER;

  -- Nota de um trecho para um perfil. p_indice: 'A' acessibilidade, 'S' segurança, 'G' geral.
  FUNCTION fn_nota_trecho (
    p_id_trecho  IN NUMBER,
    p_cd_perfil  IN VARCHAR2,
    p_periodo    IN VARCHAR2 DEFAULT NULL,
    p_indice     IN VARCHAR2 DEFAULT 'G'
  ) RETURN NUMBER;

  /* ----------------------------- Procedures ------------------------------ */

  -- Avalia um trecho (notas e se é crítico) para um perfil e período.
  PROCEDURE pr_avaliar_trecho (
    p_id_trecho       IN  NUMBER,
    p_cd_perfil       IN  VARCHAR2,
    p_periodo         IN  VARCHAR2,
    p_acessibilidade  OUT NUMBER,
    p_seguranca       OUT NUMBER,
    p_geral           OUT NUMBER,
    p_critico         OUT CHAR
  );

  -- Recalcula TB_AVALIACAO_ROTA. Com p_id_trecho, só as rotas que passam pelo trecho.
  PROCEDURE pr_recalcular_rotas (p_id_trecho IN NUMBER DEFAULT NULL);

  -- Funcionalidade 2: registra reporte (ou soma como confirmação se já houver alerta igual).
  PROCEDURE pr_registrar_alerta (
    p_id_cidadao     IN  NUMBER,
    p_cd_trecho      IN  VARCHAR2,
    p_cd_categoria   IN  VARCHAR2,
    p_cd_gravidade   IN  VARCHAR2,
    p_ds_referencia  IN  VARCHAR2,
    p_ds_descricao   IN  VARCHAR2,
    p_id_alerta      OUT NUMBER,
    p_mesclado       OUT CHAR
  );

  -- Funcionalidade 3: "Ainda está lá".
  PROCEDURE pr_confirmar_alerta (
    p_id_alerta   IN  NUMBER,
    p_id_cidadao  IN  NUMBER,
    p_resultado   OUT VARCHAR2
  );

  -- Funcionalidade 3: "Resolvido" (o autor encerra na hora; demais por votação).
  PROCEDURE pr_votar_resolvido (
    p_id_alerta   IN  NUMBER,
    p_id_cidadao  IN  NUMBER,
    p_resultado   OUT VARCHAR2
  );

  -- Atualiza a relevância dos alertas ativos (decai com o tempo sem confirmação).
  PROCEDURE pr_atualizar_relevancias;

  -- Funcionalidade 4: botão "Alerta rápido" do modo navegação.
  PROCEDURE pr_registrar_pedido_apoio (
    p_id_cidadao      IN  NUMBER,
    p_cd_rota         IN  VARCHAR2,
    p_cd_trecho       IN  VARCHAR2,
    p_tp_pedido       IN  VARCHAR2,
    p_ds_localizacao  IN  VARCHAR2,
    p_id_pedido       OUT NUMBER
  );

  -- Acompanhamento do atendimento: ABERTO → EM_ATENDIMENTO → CONCLUIDO (ou CANCELADO).
  PROCEDURE pr_atualizar_atendimento (
    p_id_pedido    IN NUMBER,
    p_novo_status  IN VARCHAR2,
    p_observacao   IN VARCHAR2 DEFAULT NULL
  );

  -- Gera os indicadores do dia por bairro (TB_INDICADOR_BAIRRO).
  PROCEDURE pr_gerar_indicadores (p_dt_referencia IN DATE DEFAULT NULL);

  -- Funcionalidade 1: imprime o comparativo de rotas (DBMS_OUTPUT) com a recomendada.
  PROCEDURE pr_comparar_rotas (
    p_cd_origem   IN VARCHAR2,
    p_cd_destino  IN VARCHAR2,
    p_cd_perfil   IN VARCHAR2,
    p_periodo     IN VARCHAR2 DEFAULT NULL
  );

END pkg_rotas_acessiveis;
/

/* =============================================================================
   PACOTE PKG_ROTAS_ACESSIVEIS — corpo
   ============================================================================= */
CREATE OR REPLACE PACKAGE BODY pkg_rotas_acessiveis AS

  /* --------------------------- Utilidades privadas ----------------------- */

  FUNCTION clamp (p_valor IN NUMBER, p_min IN NUMBER DEFAULT 0, p_max IN NUMBER DEFAULT 100)
    RETURN NUMBER IS
  BEGIN
    RETURN LEAST(p_max, GREATEST(p_min, p_valor));
  END clamp;

  FUNCTION clamp01 (p_valor IN NUMBER) RETURN NUMBER IS
  BEGIN
    RETURN clamp(p_valor, 0, 1);
  END clamp01;

  PROCEDURE validar_cidadao (p_id_cidadao IN NUMBER) IS
    v_qtd PLS_INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_qtd FROM tb_cidadao WHERE id_cidadao = p_id_cidadao;
    IF v_qtd = 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'Cidadão não encontrado: ' || p_id_cidadao);
    END IF;
  END validar_cidadao;

  FUNCTION id_trecho_por_codigo (p_cd_trecho IN VARCHAR2) RETURN NUMBER IS
    v_id tb_trecho.id_trecho%TYPE;
  BEGIN
    SELECT id_trecho INTO v_id FROM tb_trecho WHERE cd_trecho = p_cd_trecho;
    RETURN v_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20002, 'Trecho não encontrado: ' || p_cd_trecho);
  END id_trecho_por_codigo;

  PROCEDURE validar_categoria (p_cd_categoria IN VARCHAR2) IS
    v_qtd PLS_INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_qtd FROM tb_categoria_barreira WHERE cd_categoria = p_cd_categoria;
    IF v_qtd = 0 THEN
      RAISE_APPLICATION_ERROR(-20003, 'Categoria inválida: ' || p_cd_categoria);
    END IF;
  END validar_categoria;

  FUNCTION ordem_gravidade (p_cd_gravidade IN VARCHAR2) RETURN NUMBER IS
    v_ordem tb_gravidade.nr_ordem%TYPE;
  BEGIN
    SELECT nr_ordem INTO v_ordem FROM tb_gravidade WHERE cd_gravidade = p_cd_gravidade;
    RETURN v_ordem;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20004, 'Gravidade inválida: ' || p_cd_gravidade);
  END ordem_gravidade;

  FUNCTION normalizar_periodo (p_periodo IN VARCHAR2) RETURN VARCHAR2 IS
    v_periodo VARCHAR2(10) := UPPER(TRIM(p_periodo));
  BEGIN
    IF v_periodo IS NULL THEN
      RETURN fn_periodo_atual;
    ELSIF v_periodo IN ('DIA', 'NOITE') THEN
      RETURN v_periodo;
    END IF;
    RAISE_APPLICATION_ERROR(-20008, 'Período inválido (use DIA ou NOITE): ' || p_periodo);
  END normalizar_periodo;

  /* ------------------------------ Funções -------------------------------- */

  FUNCTION fn_periodo_atual RETURN VARCHAR2 IS
    v_hora NUMBER;
  BEGIN
    -- Usa o fuso de São Paulo mesmo que o servidor do banco esteja em UTC.
    SELECT TO_NUMBER(TO_CHAR(SYSTIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'HH24'))
      INTO v_hora
      FROM dual;
    RETURN CASE WHEN v_hora >= 18 OR v_hora < 6 THEN 'NOITE' ELSE 'DIA' END;
  END fn_periodo_atual;

  FUNCTION fn_confianca (
    p_confirmacoes     IN NUMBER,
    p_votos_resolvido  IN NUMBER
  ) RETURN NUMBER DETERMINISTIC IS
  BEGIN
    RETURN (NVL(p_confirmacoes, 0) + 1) / (NVL(p_confirmacoes, 0) + NVL(p_votos_resolvido, 0) + 2);
  END fn_confianca;

  FUNCTION fn_calc_relevancia (
    p_cd_gravidade           IN VARCHAR2,
    p_confirmacoes           IN NUMBER,
    p_votos_resolvido        IN NUMBER,
    p_dt_ultima_confirmacao  IN DATE,
    p_st_alerta              IN VARCHAR2
  ) RETURN NUMBER IS
    v_peso      tb_gravidade.vl_peso_relevancia%TYPE;
    v_horas     NUMBER;
    v_atualidade NUMBER;
    v_confianca NUMBER;
    v_bonus     NUMBER;
  BEGIN
    IF p_st_alerta = 'RESOLVIDO' THEN
      RETURN 0;
    END IF;

    SELECT vl_peso_relevancia INTO v_peso FROM tb_gravidade WHERE cd_gravidade = p_cd_gravidade;

    -- Meia-vida de ~1 semana: sem novas confirmações o alerta perde força, mas não some.
    v_horas      := GREATEST(0, (SYSDATE - NVL(p_dt_ultima_confirmacao, SYSDATE)) * 24);
    v_atualidade := 0.4 + 0.6 * EXP(-v_horas / 168);
    v_confianca  := fn_confianca(p_confirmacoes, p_votos_resolvido);
    v_bonus      := LEAST(NVL(p_confirmacoes, 0), 10) * 2;

    RETURN ROUND(clamp(v_peso * v_atualidade * (0.35 + 0.65 * v_confianca) + v_bonus));
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN 0;
  END fn_calc_relevancia;

  /* ------------------------- Avaliação de trecho ------------------------- */

  PROCEDURE pr_avaliar_trecho (
    p_id_trecho       IN  NUMBER,
    p_cd_perfil       IN  VARCHAR2,
    p_periodo         IN  VARCHAR2,
    p_acessibilidade  OUT NUMBER,
    p_seguranca       OUT NUMBER,
    p_geral           OUT NUMBER,
    p_critico         OUT CHAR
  ) IS
    v_t              tb_trecho%ROWTYPE;
    v_p              tb_perfil_mobilidade%ROWTYPE;
    v_periodo        VARCHAR2(5) := normalizar_periodo(p_periodo);
    v_largura_max    NUMBER;
    v_f_largura      NUMBER;
    v_f_inclinacao   NUMBER;
    v_soma_pesos     NUMBER;
    v_acess_base     NUMBER;
    v_seg_base       NUMBER;
    v_w_ilum         NUMBER;
    v_w_fluxo        NUMBER;
    v_w_ocorr        NUMBER;
    v_pen_acess      NUMBER := 0;
    v_pen_seg        NUMBER := 0;
    v_base           NUMBER;
    v_fator_luz      NUMBER;
    v_confianca      NUMBER;
    v_share          NUMBER;
    v_alerta_grave   BOOLEAN := FALSE;
    v_estrutural     BOOLEAN := FALSE;
  BEGIN
    BEGIN
      SELECT * INTO v_t FROM tb_trecho WHERE id_trecho = p_id_trecho;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20002, 'Trecho não encontrado: ' || p_id_trecho);
    END;

    BEGIN
      SELECT * INTO v_p FROM tb_perfil_mobilidade WHERE cd_perfil = p_cd_perfil;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20007, 'Perfil inválido: ' || p_cd_perfil);
    END;

    -- 1) Acessibilidade-base (0–100) com os pesos do perfil
    v_largura_max  := GREATEST(v_p.vl_largura_min_m + 0.3, 1.5);
    v_f_largura    := clamp01((v_t.vl_largura_calcada_m - 0.8) / (v_largura_max - 0.8));
    v_f_inclinacao := clamp01(1 - v_t.vl_inclinacao_pct / (2 * v_p.vl_inclinacao_max_pct));
    v_soma_pesos   := v_p.vl_peso_rampa + v_p.vl_peso_piso_tatil + v_p.vl_peso_largura + v_p.vl_peso_inclinacao;

    v_acess_base := ( v_p.vl_peso_rampa      * v_t.vl_cobertura_rampa
                    + v_p.vl_peso_piso_tatil * v_t.vl_cobertura_piso_tatil
                    + v_p.vl_peso_largura    * v_f_largura
                    + v_p.vl_peso_inclinacao * v_f_inclinacao ) / v_soma_pesos * 100;

    -- 2) Segurança-base (0–100): à noite a iluminação pesa mais
    IF v_periodo = 'NOITE' THEN
      v_w_ilum := 0.45; v_w_fluxo := 0.25; v_w_ocorr := 0.30;
    ELSE
      v_w_ilum := 0.25; v_w_fluxo := 0.35; v_w_ocorr := 0.40;
    END IF;

    v_seg_base := ( v_w_ilum  * v_t.vl_iluminacao
                  + v_w_fluxo * v_t.vl_fluxo_pedestres
                  + v_w_ocorr * clamp01(1 - v_t.qt_ocorrencias_90d / 20) ) * 100;

    -- 3) Penalidades dos alertas ativos da comunidade
    FOR a IN (
      SELECT al.cd_categoria,
             al.cd_gravidade,
             al.qt_confirmacoes,
             al.qt_votos_resolvido,
             g.vl_penalidade,
             c.vl_impacto_acessibilidade,
             c.vl_impacto_seguranca,
             NVL(s.vl_multiplicador, 1) AS vl_multiplicador
        FROM tb_alerta al
        JOIN tb_gravidade g           ON g.cd_gravidade = al.cd_gravidade
        JOIN tb_categoria_barreira c  ON c.cd_categoria = al.cd_categoria
        LEFT JOIN tb_perfil_sensibilidade s
               ON s.cd_categoria = al.cd_categoria
              AND s.cd_perfil    = p_cd_perfil
       WHERE al.id_trecho = p_id_trecho
         AND al.st_alerta = 'ATIVO'
    ) LOOP
      v_confianca := fn_confianca(a.qt_confirmacoes, a.qt_votos_resolvido);
      v_base      := a.vl_penalidade * a.vl_multiplicador * (0.4 + 0.6 * v_confianca);
      -- Poste apagado pesa mais à noite e menos de dia
      v_fator_luz := CASE
                       WHEN a.cd_categoria = 'poste_apagado' AND v_periodo = 'NOITE' THEN 1.5
                       WHEN a.cd_categoria = 'poste_apagado' THEN 0.5
                       ELSE 1
                     END;
      v_pen_acess := v_pen_acess + v_base * a.vl_impacto_acessibilidade;
      v_pen_seg   := v_pen_seg   + v_base * a.vl_impacto_seguranca * v_fator_luz;

      IF a.cd_gravidade IN ('alta', 'critica') AND v_confianca >= 0.5 THEN
        v_alerta_grave := TRUE;
      END IF;
    END LOOP;

    -- 4) Notas finais (arredondadas como no app)
    p_acessibilidade := ROUND(clamp(v_acess_base - v_pen_acess));
    p_seguranca      := ROUND(clamp(v_seg_base - v_pen_seg));
    v_share          := clamp01(v_p.vl_peso_acessibilidade - CASE WHEN v_periodo = 'NOITE' THEN 0.1 ELSE 0 END);
    p_geral          := ROUND(v_share * p_acessibilidade + (1 - v_share) * p_seguranca);

    -- 5) Barreiras estruturais críticas para o perfil (não se aplicam ao metrô)
    IF v_t.tp_trecho <> 'METRO' THEN
      v_estrutural :=
           (p_cd_perfil IN ('cadeirante', 'idoso') AND v_t.vl_inclinacao_pct > v_p.vl_inclinacao_max_pct)
        OR (v_t.vl_largura_calcada_m < v_p.vl_largura_min_m)
        OR (p_cd_perfil = 'cadeirante' AND v_t.vl_cobertura_rampa <= 0.5)
        OR (p_cd_perfil = 'deficiencia_visual' AND v_t.vl_cobertura_piso_tatil < 0.25)
        OR (v_periodo = 'NOITE' AND v_t.vl_iluminacao < 0.55)
        OR (v_periodo = 'NOITE' AND v_t.qt_ocorrencias_90d >= 15);
    END IF;

    p_critico := CASE
                   WHEN p_geral < c_nota_critica OR v_alerta_grave OR v_estrutural THEN 'S'
                   ELSE 'N'
                 END;
  END pr_avaliar_trecho;

  FUNCTION fn_nota_trecho (
    p_id_trecho  IN NUMBER,
    p_cd_perfil  IN VARCHAR2,
    p_periodo    IN VARCHAR2 DEFAULT NULL,
    p_indice     IN VARCHAR2 DEFAULT 'G'
  ) RETURN NUMBER IS
    v_acess   NUMBER;
    v_seg     NUMBER;
    v_geral   NUMBER;
    v_critico CHAR(1);
  BEGIN
    pr_avaliar_trecho(p_id_trecho, p_cd_perfil, p_periodo, v_acess, v_seg, v_geral, v_critico);
    RETURN CASE UPPER(p_indice) WHEN 'A' THEN v_acess WHEN 'S' THEN v_seg ELSE v_geral END;
  END fn_nota_trecho;

  /* -------------------------- Avaliação de rotas ------------------------- */

  PROCEDURE pr_recalcular_rotas (p_id_trecho IN NUMBER DEFAULT NULL) IS
    v_periodo     VARCHAR2(5);
    v_acess       NUMBER;
    v_seg         NUMBER;
    v_geral       NUMBER;
    v_critico     CHAR(1);
    v_peso        NUMBER;
    v_soma_peso   NUMBER;
    v_soma_acess  NUMBER;
    v_soma_seg    NUMBER;
    v_soma_geral  NUMBER;
    v_min_acess   NUMBER;
    v_min_seg     NUMBER;
    v_min_geral   NUMBER;
    v_distancia   NUMBER;
    v_duracao     NUMBER;
    v_criticos    NUMBER;
    v_nota_acess  NUMBER;
    v_nota_seg    NUMBER;
    v_nota_geral  NUMBER;
  BEGIN
    FOR r IN (
      SELECT ro.id_rota
        FROM tb_rota ro
       WHERE p_id_trecho IS NULL
          OR EXISTS (SELECT 1 FROM tb_rota_trecho rt
                      WHERE rt.id_rota = ro.id_rota AND rt.id_trecho = p_id_trecho)
    ) LOOP
      FOR p IN (SELECT cd_perfil, vl_velocidade_mps FROM tb_perfil_mobilidade) LOOP
        FOR i IN 1 .. 2 LOOP
          v_periodo := CASE i WHEN 1 THEN 'DIA' ELSE 'NOITE' END;

          v_soma_peso := 0; v_soma_acess := 0; v_soma_seg := 0; v_soma_geral := 0;
          v_min_acess := 100; v_min_seg := 100; v_min_geral := 100;
          v_distancia := 0; v_duracao := 0; v_criticos := 0;

          FOR t IN (
            SELECT tr.id_trecho, tr.tp_trecho, tr.vl_distancia_m, tr.qt_duracao_fixa_min
              FROM tb_rota_trecho rt
              JOIN tb_trecho tr ON tr.id_trecho = rt.id_trecho
             WHERE rt.id_rota = r.id_rota
             ORDER BY rt.nr_ordem
          ) LOOP
            pr_avaliar_trecho(t.id_trecho, p.cd_perfil, v_periodo, v_acess, v_seg, v_geral, v_critico);

            v_peso       := CASE WHEN t.tp_trecho = 'METRO' THEN c_peso_metro ELSE t.vl_distancia_m END;
            v_soma_peso  := v_soma_peso  + v_peso;
            v_soma_acess := v_soma_acess + v_acess * v_peso;
            v_soma_seg   := v_soma_seg   + v_seg   * v_peso;
            v_soma_geral := v_soma_geral + v_geral * v_peso;
            v_min_acess  := LEAST(v_min_acess, v_acess);
            v_min_seg    := LEAST(v_min_seg, v_seg);
            v_min_geral  := LEAST(v_min_geral, v_geral);
            v_distancia  := v_distancia + t.vl_distancia_m;
            v_duracao    := v_duracao + NVL(t.qt_duracao_fixa_min, t.vl_distancia_m / p.vl_velocidade_mps / 60);
            IF v_critico = 'S' THEN
              v_criticos := v_criticos + 1;
            END IF;
          END LOOP;

          IF v_soma_peso > 0 THEN
            -- O pior trecho ("gargalo") também pesa: a rota é tão acessível quanto seu pior ponto.
            v_nota_acess := ROUND(0.75 * (v_soma_acess / v_soma_peso) + 0.25 * v_min_acess);
            v_nota_seg   := ROUND(0.75 * (v_soma_seg   / v_soma_peso) + 0.25 * v_min_seg);
            v_nota_geral := ROUND(0.70 * (v_soma_geral / v_soma_peso) + 0.30 * v_min_geral);

            MERGE INTO tb_avaliacao_rota d
            USING (SELECT r.id_rota AS id_rota, p.cd_perfil AS cd_perfil, v_periodo AS tp_periodo FROM dual) s
               ON (d.id_rota = s.id_rota AND d.cd_perfil = s.cd_perfil AND d.tp_periodo = s.tp_periodo)
            WHEN MATCHED THEN UPDATE SET
                 d.vl_acessibilidade   = v_nota_acess,
                 d.vl_seguranca        = v_nota_seg,
                 d.vl_geral            = v_nota_geral,
                 d.qt_trechos_criticos = v_criticos,
                 d.vl_distancia_m      = v_distancia,
                 d.qt_duracao_min      = CEIL(v_duracao),
                 d.dt_calculo          = SYSDATE
            WHEN NOT MATCHED THEN INSERT
                 (id_rota, cd_perfil, tp_periodo, vl_acessibilidade, vl_seguranca, vl_geral,
                  qt_trechos_criticos, vl_distancia_m, qt_duracao_min, dt_calculo)
            VALUES
                 (s.id_rota, s.cd_perfil, s.tp_periodo, v_nota_acess, v_nota_seg, v_nota_geral,
                  v_criticos, v_distancia, CEIL(v_duracao), SYSDATE);
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END pr_recalcular_rotas;

  /* ------------------------ Alertas comunitários ------------------------- */

  PROCEDURE pr_registrar_alerta (
    p_id_cidadao     IN  NUMBER,
    p_cd_trecho      IN  VARCHAR2,
    p_cd_categoria   IN  VARCHAR2,
    p_cd_gravidade   IN  VARCHAR2,
    p_ds_referencia  IN  VARCHAR2,
    p_ds_descricao   IN  VARCHAR2,
    p_id_alerta      OUT NUMBER,
    p_mesclado       OUT CHAR
  ) IS
    v_id_trecho     NUMBER;
    v_id_existente  NUMBER;
    v_grav_atual    tb_alerta.cd_gravidade%TYPE;
    v_ordem_nova    NUMBER;
    v_qtd_votos     PLS_INTEGER;
  BEGIN
    validar_cidadao(p_id_cidadao);
    v_id_trecho := id_trecho_por_codigo(p_cd_trecho);
    validar_categoria(p_cd_categoria);
    v_ordem_nova := ordem_gravidade(p_cd_gravidade);

    IF p_ds_referencia IS NULL OR LENGTH(TRIM(p_ds_referencia)) < 3 THEN
      RAISE_APPLICATION_ERROR(-20005, 'Informe um endereço ou ponto de referência (mínimo 3 caracteres).');
    END IF;

    -- Já existe alerta ATIVO da mesma categoria no trecho? Então vira confirmação.
    SELECT MIN(id_alerta)
      INTO v_id_existente
      FROM tb_alerta
     WHERE id_trecho = v_id_trecho
       AND cd_categoria = p_cd_categoria
       AND st_alerta = 'ATIVO';

    IF v_id_existente IS NOT NULL THEN
      p_mesclado  := 'S';
      p_id_alerta := v_id_existente;

      SELECT cd_gravidade INTO v_grav_atual
        FROM tb_alerta
       WHERE id_alerta = v_id_existente
         FOR UPDATE;

      SELECT COUNT(*) INTO v_qtd_votos
        FROM tb_voto_alerta
       WHERE id_alerta = v_id_existente AND id_cidadao = p_id_cidadao;

      IF v_qtd_votos = 0 THEN
        INSERT INTO tb_voto_alerta (id_alerta, id_cidadao, tp_voto)
        VALUES (v_id_existente, p_id_cidadao, 'CONFIRMOU');

        -- A gravidade só sobe, nunca desce, por causa de um novo reporte.
        -- (calculada em PL/SQL: funções privadas do pacote não podem ser usadas dentro de SQL)
        IF v_ordem_nova > ordem_gravidade(v_grav_atual) THEN
          v_grav_atual := p_cd_gravidade;
        END IF;

        UPDATE tb_alerta
           SET qt_confirmacoes       = qt_confirmacoes + 1,
               dt_ultima_confirmacao = SYSDATE,
               cd_gravidade          = v_grav_atual
         WHERE id_alerta = v_id_existente;
      END IF;
    ELSE
      p_mesclado := 'N';

      INSERT INTO tb_alerta (id_trecho, cd_categoria, cd_gravidade, id_cidadao_autor,
                             ds_referencia, ds_descricao, qt_confirmacoes, qt_votos_resolvido, st_alerta)
      VALUES (v_id_trecho, p_cd_categoria, p_cd_gravidade, p_id_cidadao,
              TRIM(p_ds_referencia), TRIM(p_ds_descricao), 1, 0, 'ATIVO')
      RETURNING id_alerta INTO p_id_alerta;

      -- O autor conta como a primeira confirmação.
      INSERT INTO tb_voto_alerta (id_alerta, id_cidadao, tp_voto)
      VALUES (p_id_alerta, p_id_cidadao, 'CONFIRMOU');
    END IF;

    pr_recalcular_rotas(v_id_trecho);
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_registrar_alerta;

  PROCEDURE pr_confirmar_alerta (
    p_id_alerta   IN  NUMBER,
    p_id_cidadao  IN  NUMBER,
    p_resultado   OUT VARCHAR2
  ) IS
    v_status    tb_alerta.st_alerta%TYPE;
    v_id_trecho tb_alerta.id_trecho%TYPE;
    v_qtd_votos PLS_INTEGER;
  BEGIN
    validar_cidadao(p_id_cidadao);

    BEGIN
      SELECT st_alerta, id_trecho INTO v_status, v_id_trecho
        FROM tb_alerta
       WHERE id_alerta = p_id_alerta
         FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        p_resultado := 'INDISPONIVEL';
        RETURN;
    END;

    IF v_status <> 'ATIVO' THEN
      ROLLBACK; -- libera o lock
      p_resultado := 'INDISPONIVEL';
      RETURN;
    END IF;

    SELECT COUNT(*) INTO v_qtd_votos
      FROM tb_voto_alerta
     WHERE id_alerta = p_id_alerta AND id_cidadao = p_id_cidadao;

    IF v_qtd_votos > 0 THEN
      ROLLBACK;
      p_resultado := 'JA_VOTOU';
      RETURN;
    END IF;

    INSERT INTO tb_voto_alerta (id_alerta, id_cidadao, tp_voto)
    VALUES (p_id_alerta, p_id_cidadao, 'CONFIRMOU');

    UPDATE tb_alerta
       SET qt_confirmacoes       = qt_confirmacoes + 1,
           dt_ultima_confirmacao = SYSDATE
     WHERE id_alerta = p_id_alerta;

    pr_recalcular_rotas(v_id_trecho);
    COMMIT;
    p_resultado := 'REGISTRADO';
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      ROLLBACK;
      p_resultado := 'JA_VOTOU';
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_confirmar_alerta;

  PROCEDURE pr_votar_resolvido (
    p_id_alerta   IN  NUMBER,
    p_id_cidadao  IN  NUMBER,
    p_resultado   OUT VARCHAR2
  ) IS
    v_status        tb_alerta.st_alerta%TYPE;
    v_id_trecho     tb_alerta.id_trecho%TYPE;
    v_id_autor      tb_alerta.id_cidadao_autor%TYPE;
    v_confirmacoes  tb_alerta.qt_confirmacoes%TYPE;
    v_votos         tb_alerta.qt_votos_resolvido%TYPE;
    v_voto_atual    tb_voto_alerta.tp_voto%TYPE;
    v_eh_autor      BOOLEAN;
  BEGIN
    validar_cidadao(p_id_cidadao);

    BEGIN
      SELECT st_alerta, id_trecho, id_cidadao_autor, qt_confirmacoes, qt_votos_resolvido
        INTO v_status, v_id_trecho, v_id_autor, v_confirmacoes, v_votos
        FROM tb_alerta
       WHERE id_alerta = p_id_alerta
         FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        p_resultado := 'INDISPONIVEL';
        RETURN;
    END;

    IF v_status <> 'ATIVO' THEN
      ROLLBACK;
      p_resultado := 'INDISPONIVEL';
      RETURN;
    END IF;

    BEGIN
      SELECT tp_voto INTO v_voto_atual
        FROM tb_voto_alerta
       WHERE id_alerta = p_id_alerta AND id_cidadao = p_id_cidadao;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        v_voto_atual := NULL;
    END;

    v_eh_autor := (v_id_autor = p_id_cidadao);

    -- Só pode votar quem ainda não votou; exceção: o autor que apenas confirmou.
    IF v_voto_atual IS NOT NULL AND NOT (v_eh_autor AND v_voto_atual = 'CONFIRMOU') THEN
      ROLLBACK;
      p_resultado := 'JA_VOTOU';
      RETURN;
    END IF;

    IF v_voto_atual IS NULL THEN
      INSERT INTO tb_voto_alerta (id_alerta, id_cidadao, tp_voto)
      VALUES (p_id_alerta, p_id_cidadao, 'RESOLVEU');
    ELSE
      UPDATE tb_voto_alerta
         SET tp_voto = 'RESOLVEU', dt_voto = SYSDATE
       WHERE id_alerta = p_id_alerta AND id_cidadao = p_id_cidadao;
    END IF;

    v_votos := v_votos + 1;

    IF v_eh_autor OR (v_votos >= c_min_votos_resolucao AND v_votos > v_confirmacoes) THEN
      UPDATE tb_alerta
         SET qt_votos_resolvido = v_votos,
             st_alerta          = 'RESOLVIDO',
             dt_resolucao       = SYSDATE
       WHERE id_alerta = p_id_alerta;
      p_resultado := 'ENCERRADO';
    ELSE
      UPDATE tb_alerta
         SET qt_votos_resolvido = v_votos
       WHERE id_alerta = p_id_alerta;
      p_resultado := 'REGISTRADO';
    END IF;

    pr_recalcular_rotas(v_id_trecho);
    COMMIT;
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      ROLLBACK;
      p_resultado := 'JA_VOTOU';
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_votar_resolvido;

  PROCEDURE pr_atualizar_relevancias IS
  BEGIN
    UPDATE tb_alerta
       SET vl_relevancia = pkg_rotas_acessiveis.fn_calc_relevancia(
                             cd_gravidade, qt_confirmacoes, qt_votos_resolvido,
                             dt_ultima_confirmacao, st_alerta)
     WHERE st_alerta = 'ATIVO';
    DBMS_OUTPUT.PUT_LINE('Relevância atualizada em ' || SQL%ROWCOUNT || ' alerta(s) ativo(s).');
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_atualizar_relevancias;

  /* ------------------------- Pedidos de apoio ---------------------------- */

  PROCEDURE pr_registrar_pedido_apoio (
    p_id_cidadao      IN  NUMBER,
    p_cd_rota         IN  VARCHAR2,
    p_cd_trecho       IN  VARCHAR2,
    p_tp_pedido       IN  VARCHAR2,
    p_ds_localizacao  IN  VARCHAR2,
    p_id_pedido       OUT NUMBER
  ) IS
    v_id_rota   NUMBER;
    v_id_trecho NUMBER;
    v_tipo      VARCHAR2(10) := UPPER(TRIM(p_tp_pedido));
  BEGIN
    validar_cidadao(p_id_cidadao);

    IF v_tipo NOT IN ('APOIO', 'EMERGENCIA') OR v_tipo IS NULL THEN
      RAISE_APPLICATION_ERROR(-20009, 'Tipo de pedido inválido (use APOIO ou EMERGENCIA): ' || p_tp_pedido);
    END IF;

    IF p_cd_rota IS NOT NULL THEN
      BEGIN
        SELECT id_rota INTO v_id_rota FROM tb_rota WHERE cd_rota = p_cd_rota;
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          RAISE_APPLICATION_ERROR(-20012, 'Rota não encontrada: ' || p_cd_rota);
      END;
    END IF;

    IF p_cd_trecho IS NOT NULL THEN
      v_id_trecho := id_trecho_por_codigo(p_cd_trecho);
    END IF;

    INSERT INTO tb_pedido_apoio (id_cidadao, id_rota, id_trecho, tp_pedido, ds_localizacao)
    VALUES (p_id_cidadao, v_id_rota, v_id_trecho, v_tipo, NVL(p_ds_localizacao, 'Local não informado'))
    RETURNING id_pedido INTO p_id_pedido;

    IF v_tipo = 'EMERGENCIA' THEN
      DBMS_OUTPUT.PUT_LINE('*** EMERGÊNCIA registrada (pedido ' || p_id_pedido || '): ' || p_ds_localizacao);
    END IF;

    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_registrar_pedido_apoio;

  PROCEDURE pr_atualizar_atendimento (
    p_id_pedido    IN NUMBER,
    p_novo_status  IN VARCHAR2,
    p_observacao   IN VARCHAR2 DEFAULT NULL
  ) IS
    v_atual tb_pedido_apoio.st_atendimento%TYPE;
    v_novo  VARCHAR2(15) := UPPER(TRIM(p_novo_status));
  BEGIN
    BEGIN
      SELECT st_atendimento INTO v_atual
        FROM tb_pedido_apoio
       WHERE id_pedido = p_id_pedido
         FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20011, 'Pedido de apoio não encontrado: ' || p_id_pedido);
    END;

    -- Máquina de estados do atendimento
    IF NOT (   (v_atual = 'ABERTO'         AND v_novo IN ('EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO'))
            OR (v_atual = 'EM_ATENDIMENTO' AND v_novo IN ('CONCLUIDO', 'CANCELADO'))) THEN
      RAISE_APPLICATION_ERROR(-20010, 'Transição inválida: ' || v_atual || ' -> ' || NVL(v_novo, '(vazio)'));
    END IF;

    UPDATE tb_pedido_apoio
       SET st_atendimento        = v_novo,
           dt_inicio_atendimento = CASE WHEN v_novo = 'EM_ATENDIMENTO' THEN SYSDATE ELSE dt_inicio_atendimento END,
           dt_conclusao          = CASE WHEN v_novo IN ('CONCLUIDO', 'CANCELADO') THEN SYSDATE ELSE dt_conclusao END,
           ds_observacao         = NVL(p_observacao, ds_observacao)
     WHERE id_pedido = p_id_pedido;

    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_atualizar_atendimento;

  /* ----------------------------- Indicadores ----------------------------- */

  PROCEDURE pr_gerar_indicadores (p_dt_referencia IN DATE DEFAULT NULL) IS
    v_dt DATE := TRUNC(NVL(p_dt_referencia, SYSDATE));
  BEGIN
    MERGE INTO tb_indicador_bairro d
    USING (
      SELECT b.nm_bairro,
             (SELECT COUNT(*)
                FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
               WHERE t.nm_bairro = b.nm_bairro AND a.st_alerta = 'ATIVO') AS qt_ativos,
             (SELECT COUNT(*)
                FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
               WHERE t.nm_bairro = b.nm_bairro AND a.st_alerta = 'ATIVO'
                 AND a.cd_gravidade IN ('alta', 'critica')) AS qt_graves,
             (SELECT COUNT(*)
                FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
               WHERE t.nm_bairro = b.nm_bairro AND a.st_alerta = 'RESOLVIDO'
                 AND a.dt_resolucao >= v_dt - 30 AND a.dt_resolucao < v_dt + 1) AS qt_resolvidos,
             (SELECT ROUND(AVG((a.dt_resolucao - a.dt_criacao) * 24), 1)
                FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
               WHERE t.nm_bairro = b.nm_bairro AND a.st_alerta = 'RESOLVIDO'
                 AND a.dt_resolucao >= v_dt - 30 AND a.dt_resolucao < v_dt + 1) AS vl_tempo_medio,
             (SELECT COUNT(*)
                FROM tb_pedido_apoio pa JOIN tb_trecho t ON t.id_trecho = pa.id_trecho
               WHERE t.nm_bairro = b.nm_bairro
                 AND pa.dt_pedido >= v_dt - 30 AND pa.dt_pedido < v_dt + 1) AS qt_pedidos,
             (SELECT STATS_MODE(a.cd_categoria)
                FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
               WHERE t.nm_bairro = b.nm_bairro AND a.st_alerta = 'ATIVO') AS cd_predominante
        FROM (SELECT DISTINCT nm_bairro FROM tb_trecho) b
    ) s
    ON (d.dt_referencia = v_dt AND d.nm_bairro = s.nm_bairro)
    WHEN MATCHED THEN UPDATE SET
         d.qt_alertas_ativos          = s.qt_ativos,
         d.qt_alertas_graves          = s.qt_graves,
         d.qt_resolvidos_30d          = s.qt_resolvidos,
         d.vl_tempo_medio_resolucao_h = s.vl_tempo_medio,
         d.qt_pedidos_apoio_30d       = s.qt_pedidos,
         d.cd_categoria_predominante  = s.cd_predominante,
         d.dt_geracao                 = SYSDATE
    WHEN NOT MATCHED THEN INSERT
         (dt_referencia, nm_bairro, qt_alertas_ativos, qt_alertas_graves, qt_resolvidos_30d,
          vl_tempo_medio_resolucao_h, qt_pedidos_apoio_30d, cd_categoria_predominante, dt_geracao)
    VALUES
         (v_dt, s.nm_bairro, s.qt_ativos, s.qt_graves, s.qt_resolvidos,
          s.vl_tempo_medio, s.qt_pedidos, s.cd_predominante, SYSDATE);

    DBMS_OUTPUT.PUT_LINE('Indicadores de ' || TO_CHAR(v_dt, 'DD/MM/YYYY') || ' gerados para '
                         || SQL%ROWCOUNT || ' bairro(s).');
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
  END pr_gerar_indicadores;

  /* ------------------------ Comparativo de rotas ------------------------- */

  PROCEDURE pr_comparar_rotas (
    p_cd_origem   IN VARCHAR2,
    p_cd_destino  IN VARCHAR2,
    p_cd_perfil   IN VARCHAR2,
    p_periodo     IN VARCHAR2 DEFAULT NULL
  ) IS
    v_periodo   VARCHAR2(5) := normalizar_periodo(p_periodo);
    v_origem    tb_local%ROWTYPE;
    v_destino   tb_local%ROWTYPE;
    v_nm_perfil tb_perfil_mobilidade.nm_perfil%TYPE;
    v_posicao   PLS_INTEGER := 0;
  BEGIN
    BEGIN
      SELECT * INTO v_origem  FROM tb_local WHERE cd_local = p_cd_origem;
      SELECT * INTO v_destino FROM tb_local WHERE cd_local = p_cd_destino;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20013, 'Local de origem ou destino não encontrado.');
    END;

    BEGIN
      SELECT nm_perfil INTO v_nm_perfil FROM tb_perfil_mobilidade WHERE cd_perfil = p_cd_perfil;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20007, 'Perfil inválido: ' || p_cd_perfil);
    END;

    DBMS_OUTPUT.PUT_LINE('================================================================');
    DBMS_OUTPUT.PUT_LINE(' ' || v_origem.nm_curto || ' -> ' || v_destino.nm_curto);
    DBMS_OUTPUT.PUT_LINE(' Perfil: ' || v_nm_perfil || ' | Período: ' || v_periodo);
    DBMS_OUTPUT.PUT_LINE('================================================================');

    FOR r IN (
      SELECT ro.id_rota, ro.nm_rota, av.vl_geral, av.vl_acessibilidade, av.vl_seguranca,
             av.qt_trechos_criticos, av.qt_duracao_min, av.vl_distancia_m
        FROM tb_avaliacao_rota av
        JOIN tb_rota ro ON ro.id_rota = av.id_rota
       WHERE av.cd_perfil = p_cd_perfil
         AND av.tp_periodo = v_periodo
         AND (   (ro.id_local_origem = v_origem.id_local AND ro.id_local_destino = v_destino.id_local)
              OR (ro.id_local_origem = v_destino.id_local AND ro.id_local_destino = v_origem.id_local))
       ORDER BY av.vl_geral DESC, av.qt_trechos_criticos, av.qt_duracao_min
    ) LOOP
      v_posicao := v_posicao + 1;
      DBMS_OUTPUT.PUT_LINE(v_posicao || '. ' || r.nm_rota
                           || CASE WHEN v_posicao = 1 THEN '   <== RECOMENDADA' END);
      DBMS_OUTPUT.PUT_LINE('   Geral ' || r.vl_geral
                           || ' | Acessibilidade ' || r.vl_acessibilidade
                           || ' | Segurança ' || r.vl_seguranca
                           || ' | Trechos críticos ' || r.qt_trechos_criticos
                           || ' | ' || r.qt_duracao_min || ' min | ' || r.vl_distancia_m || ' m');

      FOR al IN (
        SELECT c.nm_categoria, g.nm_gravidade, a.ds_referencia
          FROM tb_rota_trecho rt
          JOIN tb_alerta a ON a.id_trecho = rt.id_trecho AND a.st_alerta = 'ATIVO'
          JOIN tb_categoria_barreira c ON c.cd_categoria = a.cd_categoria
          JOIN tb_gravidade g ON g.cd_gravidade = a.cd_gravidade
         WHERE rt.id_rota = r.id_rota
         ORDER BY rt.nr_ordem, g.nr_ordem DESC
      ) LOOP
        DBMS_OUTPUT.PUT_LINE('   ! ' || al.nm_categoria || ' (' || al.nm_gravidade || '): ' || al.ds_referencia);
      END LOOP;
    END LOOP;

    IF v_posicao = 0 THEN
      DBMS_OUTPUT.PUT_LINE('Nenhuma rota cadastrada para este trajeto.');
    END IF;
  END pr_comparar_rotas;

END pkg_rotas_acessiveis;
/

/* =============================================================================
   TRIGGERS
   ============================================================================= */

-- Mantém datas e relevância coerentes a cada INSERT/UPDATE de alerta.
CREATE OR REPLACE TRIGGER trg_alerta_biu
BEFORE INSERT OR UPDATE ON tb_alerta
FOR EACH ROW
BEGIN
  IF INSERTING THEN
    :NEW.dt_criacao            := NVL(:NEW.dt_criacao, SYSDATE);
    :NEW.dt_ultima_confirmacao := NVL(:NEW.dt_ultima_confirmacao, :NEW.dt_criacao);
    :NEW.dt_atualizacao        := NVL(:NEW.dt_atualizacao, :NEW.dt_criacao);
  ELSIF :NEW.st_alerta          <> :OLD.st_alerta
     OR :NEW.qt_confirmacoes    <> :OLD.qt_confirmacoes
     OR :NEW.qt_votos_resolvido <> :OLD.qt_votos_resolvido
     OR :NEW.cd_gravidade       <> :OLD.cd_gravidade THEN
    :NEW.dt_atualizacao := SYSDATE;
  END IF;

  -- Coerência entre status e data de resolução
  IF :NEW.st_alerta = 'RESOLVIDO' AND :NEW.dt_resolucao IS NULL THEN
    :NEW.dt_resolucao := SYSDATE;
  ELSIF :NEW.st_alerta = 'ATIVO' THEN
    :NEW.dt_resolucao := NULL;
  END IF;

  :NEW.vl_relevancia := pkg_rotas_acessiveis.fn_calc_relevancia(
                          :NEW.cd_gravidade, :NEW.qt_confirmacoes, :NEW.qt_votos_resolvido,
                          :NEW.dt_ultima_confirmacao, :NEW.st_alerta);
END;
/

-- Auditoria: registra criação, confirmações, votos, resolução e mudança de gravidade.
CREATE OR REPLACE TRIGGER trg_alerta_auditoria
AFTER INSERT OR UPDATE ON tb_alerta
FOR EACH ROW
DECLARE
  v_evento tb_historico_alerta.tp_evento%TYPE;
BEGIN
  IF INSERTING THEN
    v_evento := 'CRIACAO';
  ELSIF :OLD.st_alerta = 'ATIVO' AND :NEW.st_alerta = 'RESOLVIDO' THEN
    v_evento := 'RESOLUCAO';
  ELSIF :OLD.st_alerta = 'RESOLVIDO' AND :NEW.st_alerta = 'ATIVO' THEN
    v_evento := 'REABERTURA';
  ELSIF :NEW.qt_votos_resolvido > :OLD.qt_votos_resolvido THEN
    v_evento := 'VOTO_RESOLVIDO';
  ELSIF :NEW.qt_confirmacoes > :OLD.qt_confirmacoes THEN
    v_evento := 'CONFIRMACAO';
  ELSIF :NEW.cd_gravidade <> :OLD.cd_gravidade THEN
    v_evento := 'ALTERACAO_GRAVIDADE';
  END IF;

  -- Atualizações só de relevância (job diário) não geram histórico.
  IF v_evento IS NOT NULL THEN
    INSERT INTO tb_historico_alerta (id_alerta, tp_evento, st_anterior, st_novo,
                                     cd_gravidade_anterior, cd_gravidade_nova,
                                     qt_confirmacoes, qt_votos_resolvido)
    VALUES (:NEW.id_alerta, v_evento, :OLD.st_alerta, :NEW.st_alerta,
            :OLD.cd_gravidade, :NEW.cd_gravidade,
            :NEW.qt_confirmacoes, :NEW.qt_votos_resolvido);
  END IF;
END;
/

/* =============================================================================
   VIEWS
   ============================================================================= */

-- Feed de alertas ativos (Funcionalidade 3), já com confiança calculada.
CREATE OR REPLACE VIEW vw_alertas_ativos AS
SELECT a.id_alerta,
       c.nm_categoria,
       g.nm_gravidade,
       g.nr_ordem                                   AS nr_ordem_gravidade,
       t.cd_trecho,
       t.nm_logradouro,
       t.ds_ponto_inicial || ' -> ' || t.ds_ponto_final AS ds_trecho,
       t.nm_bairro,
       a.ds_referencia,
       a.ds_descricao,
       a.qt_confirmacoes,
       a.qt_votos_resolvido,
       ROUND(pkg_rotas_acessiveis.fn_confianca(a.qt_confirmacoes, a.qt_votos_resolvido), 2) AS vl_confianca,
       a.vl_relevancia,
       ci.nm_exibicao                               AS nm_autor,
       a.dt_criacao,
       ROUND((SYSDATE - a.dt_ultima_confirmacao) * 24, 1) AS qt_horas_sem_confirmacao
  FROM tb_alerta a
  JOIN tb_categoria_barreira c ON c.cd_categoria = a.cd_categoria
  JOIN tb_gravidade g          ON g.cd_gravidade = a.cd_gravidade
  JOIN tb_trecho t             ON t.id_trecho    = a.id_trecho
  JOIN tb_cidadao ci           ON ci.id_cidadao  = a.id_cidadao_autor
 WHERE a.st_alerta = 'ATIVO';

-- Ranking das rotas por trajeto, perfil e período (Funcionalidade 1).
CREATE OR REPLACE VIEW vw_ranking_rotas AS
SELECT o.nm_curto    AS nm_origem,
       d.nm_curto    AS nm_destino,
       r.cd_rota,
       r.nm_rota,
       av.cd_perfil,
       av.tp_periodo,
       av.vl_geral,
       av.vl_acessibilidade,
       av.vl_seguranca,
       av.qt_trechos_criticos,
       av.qt_duracao_min,
       av.vl_distancia_m,
       RANK() OVER (PARTITION BY r.id_local_origem, r.id_local_destino, av.cd_perfil, av.tp_periodo
                    ORDER BY av.vl_geral DESC, av.qt_trechos_criticos, av.qt_duracao_min) AS nr_posicao
  FROM tb_avaliacao_rota av
  JOIN tb_rota r  ON r.id_rota  = av.id_rota
  JOIN tb_local o ON o.id_local = r.id_local_origem
  JOIN tb_local d ON d.id_local = r.id_local_destino;

-- Fila de atendimento dos pedidos de apoio (Funcionalidade 4).
CREATE OR REPLACE VIEW vw_pedidos_em_aberto AS
SELECT p.id_pedido,
       p.tp_pedido,
       p.st_atendimento,
       c.nm_exibicao   AS nm_cidadao,
       pm.nm_perfil,
       r.nm_rota,
       p.ds_localizacao,
       p.dt_pedido,
       ROUND((SYSDATE - p.dt_pedido) * 24 * 60) AS qt_minutos_aguardando
  FROM tb_pedido_apoio p
  JOIN tb_cidadao c            ON c.id_cidadao = p.id_cidadao
  JOIN tb_perfil_mobilidade pm ON pm.cd_perfil = c.cd_perfil
  LEFT JOIN tb_rota r          ON r.id_rota    = p.id_rota
 WHERE p.st_atendimento IN ('ABERTO', 'EM_ATENDIMENTO');

/* =============================================================================
   JOB DIÁRIO (opcional): atualiza relevâncias e gera indicadores às 06h.
   Requer o privilégio CREATE JOB; se não houver, apenas avisa e segue.
   ============================================================================= */
BEGIN
  BEGIN
    DBMS_SCHEDULER.DROP_JOB('JOB_ROTAS_ACESSIVEIS_DIARIO', force => TRUE);
  EXCEPTION
    WHEN OTHERS THEN NULL; -- job ainda não existe
  END;

  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'JOB_ROTAS_ACESSIVEIS_DIARIO',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN pkg_rotas_acessiveis.pr_atualizar_relevancias; '
                    || 'pkg_rotas_acessiveis.pr_gerar_indicadores; END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
    enabled         => TRUE,
    comments        => 'Rotas Acessíveis SP: relevância dos alertas e indicadores por bairro');
  DBMS_OUTPUT.PUT_LINE('Job diário JOB_ROTAS_ACESSIVEIS_DIARIO criado.');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Aviso: job não criado (' || SQLERRM || '). Rode as procedures manualmente.');
END;
/

-- Verificação: deve listar o pacote, triggers e views como VALID.
SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_name IN ('PKG_ROTAS_ACESSIVEIS', 'TRG_ALERTA_BIU', 'TRG_ALERTA_AUDITORIA',
                       'VW_ALERTAS_ATIVOS', 'VW_RANKING_ROTAS', 'VW_PEDIDOS_EM_ABERTO')
 ORDER BY object_type, object_name;
