/* =============================================================================
   ROTAS ACESSÍVEIS SP — Global Solution 2 (CitizenTech)
   Script 04 — Testes e demonstração das rotinas PL/SQL
   Rode com F5 ("Executar Script") no SQL Developer, logo após 01, 02 e 03.
   Para repetir do zero, rode novamente 01 → 02 → 03 → 04.
   Os valores "ESPERADO" são os mesmos que o aplicativo mostra para os mesmos dados.
   ============================================================================= */

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET DEFINE OFF;

PROMPT
PROMPT ==== TESTE 1 — Comparador de rotas (Funcionalidade 1) ====
BEGIN
  pkg_rotas_acessiveis.pr_comparar_rotas('theatro', 'se', 'cadeirante', 'DIA');
  pkg_rotas_acessiveis.pr_comparar_rotas('theatro', 'se', 'pedestre', 'NOITE');
  pkg_rotas_acessiveis.pr_comparar_rotas('consolacao', 'hc', 'cadeirante', 'DIA');
END;
/
/* ESPERADO
   Theatro -> Sé | cadeirante | DIA
     1. Vale do Anhangabaú e Rua XV       Geral 72 | Acess. 77 | Seg. 56 | Críticos 0 | 23 min | 1200 m  <== RECOMENDADA
     2. Metrô Linha 3: Anhangabaú → Sé    Geral 64 | Acess. 57 | Seg. 68 | Críticos 1 | 13 min | 1250 m
        ! Elevador parado (Crítica) ...   (é por causa dele que o metrô perde para o cadeirante)
     3. Viaduto do Chá e Rua Direita      Geral 57 | Acess. 62 | Seg. 51 | Críticos 2 | 15 min |  800 m
   Theatro -> Sé | pedestre | NOITE
     1. Metrô Linha 3 (70) · 2. Vale do Anhangabaú (59) · 3. Viaduto do Chá (48)
   Consolação -> HC | cadeirante | DIA
     1. Metrô Linha 2 até Clínicas (90) · 2. Pela Rua Oscar Freire (67) · 3. Pela Av. Dr. Arnaldo (63) */

PROMPT
PROMPT ==== TESTE 2 — Novo reporte de barreira (Funcionalidade 2) ====
DECLARE
  v_demo      NUMBER;
  v_id_alerta NUMBER;
  v_mesclado  CHAR(1);
BEGIN
  SELECT id_cidadao INTO v_demo FROM tb_cidadao WHERE nm_exibicao = 'Cidadão Demo';

  pkg_rotas_acessiveis.pr_registrar_alerta(
    p_id_cidadao    => v_demo,
    p_cd_trecho     => 's24',
    p_cd_categoria  => 'obstaculo_calcada',
    p_cd_gravidade  => 'media',
    p_ds_referencia => 'Em frente à banca de jornal, perto do elevador do metrô',
    p_ds_descricao  => 'Banca e caixas ocupando metade da calçada.',
    p_id_alerta     => v_id_alerta,
    p_mesclado      => v_mesclado);

  DBMS_OUTPUT.PUT_LINE('Alerta ' || v_id_alerta || ' | mesclado = ' || v_mesclado);
END;
/
-- ESPERADO: mesclado = N (alerta novo, com 1 confirmação: a do próprio autor)

PROMPT
PROMPT ==== TESTE 3 — Reporte duplicado vira confirmação ====
DECLARE
  v_demo      NUMBER;
  v_id_alerta NUMBER;
  v_mesclado  CHAR(1);
  v_conf      NUMBER;
  v_grav      VARCHAR2(10);
BEGIN
  SELECT id_cidadao INTO v_demo FROM tb_cidadao WHERE nm_exibicao = 'Cidadão Demo';

  -- Já existe "elevador parado" (gravidade crítica) no trecho s25
  pkg_rotas_acessiveis.pr_registrar_alerta(v_demo, 's25', 'elevador_inoperante', 'alta',
    'Estação Sé, saída da Praça', 'Elevador continua parado.', v_id_alerta, v_mesclado);

  SELECT qt_confirmacoes, cd_gravidade INTO v_conf, v_grav FROM tb_alerta WHERE id_alerta = v_id_alerta;
  DBMS_OUTPUT.PUT_LINE('Alerta ' || v_id_alerta || ' | mesclado = ' || v_mesclado
                       || ' | confirmações = ' || v_conf || ' | gravidade = ' || v_grav);
END;
/
-- ESPERADO: mesclado = S | confirmações = 5 | gravidade = critica (não rebaixa para "alta")

PROMPT
PROMPT ==== TESTE 4 — "Ainda está lá" e voto duplicado (Funcionalidade 3) ====
DECLARE
  v_vol1      NUMBER;
  v_id_alerta NUMBER;
  v_res       VARCHAR2(20);
BEGIN
  SELECT id_cidadao INTO v_vol1 FROM tb_cidadao WHERE nm_exibicao = 'Voluntário Teste 1';
  SELECT a.id_alerta INTO v_id_alerta
    FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
   WHERE t.cd_trecho = 's20' AND a.cd_categoria = 'calcada_quebrada' AND a.st_alerta = 'ATIVO';

  pkg_rotas_acessiveis.pr_confirmar_alerta(v_id_alerta, v_vol1, v_res);
  DBMS_OUTPUT.PUT_LINE('1º voto: ' || v_res);
  pkg_rotas_acessiveis.pr_confirmar_alerta(v_id_alerta, v_vol1, v_res);
  DBMS_OUTPUT.PUT_LINE('2º voto: ' || v_res);
END;
/
-- ESPERADO: 1º voto: REGISTRADO (12 -> 13 confirmações) | 2º voto: JA_VOTOU

PROMPT
PROMPT ==== TESTE 5 — Encerramento coletivo por votação ====
DECLARE
  v_vol1      NUMBER;
  v_id_alerta NUMBER;
  v_res       VARCHAR2(20);
BEGIN
  SELECT id_cidadao INTO v_vol1 FROM tb_cidadao WHERE nm_exibicao = 'Voluntário Teste 1';
  -- Alerta com 2 confirmações e 2 votos de resolvido: o 3º voto encerra (3 >= 3 e 3 > 2)
  SELECT a.id_alerta INTO v_id_alerta
    FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
   WHERE t.cd_trecho = 's21' AND a.cd_categoria = 'poste_apagado' AND a.st_alerta = 'ATIVO';

  pkg_rotas_acessiveis.pr_votar_resolvido(v_id_alerta, v_vol1, v_res);
  DBMS_OUTPUT.PUT_LINE('Resultado: ' || v_res);
END;
/
-- ESPERADO: Resultado: ENCERRADO

PROMPT
PROMPT ==== TESTE 6 — Autor encerra o próprio alerta ====
DECLARE
  v_demo      NUMBER;
  v_carla     NUMBER;
  v_vol2      NUMBER;
  v_id_novo   NUMBER;
  v_id_elev   NUMBER;
  v_res       VARCHAR2(20);
BEGIN
  SELECT id_cidadao INTO v_demo  FROM tb_cidadao WHERE nm_exibicao = 'Cidadão Demo';
  SELECT id_cidadao INTO v_carla FROM tb_cidadao WHERE nm_exibicao = 'Carla M.';
  SELECT id_cidadao INTO v_vol2  FROM tb_cidadao WHERE nm_exibicao = 'Voluntária Teste 2';

  SELECT a.id_alerta INTO v_id_novo
    FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
   WHERE t.cd_trecho = 's24' AND a.cd_categoria = 'obstaculo_calcada' AND a.st_alerta = 'ATIVO';
  SELECT a.id_alerta INTO v_id_elev
    FROM tb_alerta a JOIN tb_trecho t ON t.id_trecho = a.id_trecho
   WHERE t.cd_trecho = 's25' AND a.cd_categoria = 'elevador_inoperante' AND a.st_alerta = 'ATIVO';

  -- O Cidadão Demo já "confirmou" ao reportar, mas como autor pode encerrar
  pkg_rotas_acessiveis.pr_votar_resolvido(v_id_novo, v_demo, v_res);
  DBMS_OUTPUT.PUT_LINE('Demo encerra o próprio reporte: ' || v_res);

  -- A autora do alerta do elevador informa que ele voltou a funcionar
  pkg_rotas_acessiveis.pr_votar_resolvido(v_id_elev, v_carla, v_res);
  DBMS_OUTPUT.PUT_LINE('Carla encerra o alerta do elevador: ' || v_res);

  -- Voto em alerta já encerrado
  pkg_rotas_acessiveis.pr_votar_resolvido(v_id_elev, v_vol2, v_res);
  DBMS_OUTPUT.PUT_LINE('Voluntária 2 tenta votar depois: ' || v_res);
END;
/
-- ESPERADO: ENCERRADO | ENCERRADO | INDISPONIVEL

PROMPT
PROMPT ==== TESTE 7 — A recomendação muda em tempo real ====
BEGIN
  pkg_rotas_acessiveis.pr_comparar_rotas('theatro', 'se', 'cadeirante', 'DIA');
  pkg_rotas_acessiveis.pr_comparar_rotas('se', 'theatro', 'pedestre', 'NOITE');
END;
/
/* ESPERADO (compare com o TESTE 1)
   Theatro -> Sé | cadeirante | DIA
     1. Metrô Linha 3: Anhangabaú → Sé    Geral 82 | Acess. 88 | Seg. 68 | Críticos 0 | 13 min  <== RECOMENDADA
     2. Vale do Anhangabaú e Rua XV       Geral 72 | Acess. 78 | Seg. 58 | Críticos 0 | 23 min
     3. Viaduto do Chá e Rua Direita      Geral 57 | Acess. 62 | Seg. 51 | Críticos 2 | 15 min
   Sé -> Theatro (sentido inverso usa as mesmas rotas) | pedestre | NOITE
     1. Metrô Linha 3 (74) · 2. Vale do Anhangabaú (65) · 3. Viaduto do Chá (48) */

PROMPT
PROMPT ==== TESTE 8 — Validações e mensagens de erro ====
DECLARE
  v_demo      NUMBER;
  v_id_alerta NUMBER;
  v_mesclado  CHAR(1);
BEGIN
  SELECT id_cidadao INTO v_demo FROM tb_cidadao WHERE nm_exibicao = 'Cidadão Demo';

  BEGIN
    pkg_rotas_acessiveis.pr_registrar_alerta(v_demo, 's01', 'falta_rampa', 'alta', 'ab', NULL, v_id_alerta, v_mesclado);
  EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Referência curta  -> ' || SQLERRM);
  END;

  BEGIN
    pkg_rotas_acessiveis.pr_registrar_alerta(v_demo, 's99', 'falta_rampa', 'alta', 'Rua X, 100', NULL, v_id_alerta, v_mesclado);
  EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Trecho inexistente -> ' || SQLERRM);
  END;

  BEGIN
    pkg_rotas_acessiveis.pr_registrar_alerta(v_demo, 's01', 'buraco_negro', 'alta', 'Rua X, 100', NULL, v_id_alerta, v_mesclado);
  EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Categoria inválida -> ' || SQLERRM);
  END;

  BEGIN
    pkg_rotas_acessiveis.pr_comparar_rotas('theatro', 'se', 'astronauta', 'DIA');
  EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Perfil inválido    -> ' || SQLERRM);
  END;
END;
/
-- ESPERADO: ORA-20005, ORA-20002, ORA-20003 e ORA-20007 com mensagens em português

PROMPT
PROMPT ==== TESTE 9 — Pedido de apoio e acompanhamento do atendimento (Funcionalidade 4) ====
DECLARE
  v_demo   NUMBER;
  v_pedido NUMBER;
BEGIN
  SELECT id_cidadao INTO v_demo FROM tb_cidadao WHERE nm_exibicao = 'Cidadão Demo';

  pkg_rotas_acessiveis.pr_registrar_pedido_apoio(v_demo, 'r09', 's26', 'APOIO',
    'Praça da Sé (Estação Sé -> Catedral da Sé)', v_pedido);
  DBMS_OUTPUT.PUT_LINE('Pedido ' || v_pedido || ' registrado (ABERTO)');

  pkg_rotas_acessiveis.pr_atualizar_atendimento(v_pedido, 'EM_ATENDIMENTO', 'Agente a caminho.');
  DBMS_OUTPUT.PUT_LINE('Pedido ' || v_pedido || ' -> EM_ATENDIMENTO');

  pkg_rotas_acessiveis.pr_atualizar_atendimento(v_pedido, 'CONCLUIDO', 'Cidadão acompanhado até a catedral.');
  DBMS_OUTPUT.PUT_LINE('Pedido ' || v_pedido || ' -> CONCLUIDO');

  BEGIN
    pkg_rotas_acessiveis.pr_atualizar_atendimento(v_pedido, 'EM_ATENDIMENTO');
  EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Reabrir pedido concluído -> ' || SQLERRM);
  END;
END;
/
-- ESPERADO: ABERTO -> EM_ATENDIMENTO -> CONCLUIDO; a última tentativa gera ORA-20010

PROMPT
PROMPT ==== TESTE 10 — Rotinas de manutenção (as mesmas do job diário) ====
BEGIN
  pkg_rotas_acessiveis.pr_atualizar_relevancias;
  pkg_rotas_acessiveis.pr_gerar_indicadores;
END;
/
-- ESPERADO: "Relevância atualizada em 10 alerta(s) ativo(s)." e "Indicadores ... gerados para 10 bairro(s)."

/* =============================================================================
   CONSULTAS PARA A DEMONSTRAÇÃO
   ============================================================================= */

PROMPT
PROMPT ---- Top 5 alertas ativos por relevância (view do feed) ----
SELECT id_alerta, nm_categoria, nm_gravidade, nm_logradouro, nm_bairro,
       qt_confirmacoes, qt_votos_resolvido, vl_confianca, vl_relevancia
  FROM vw_alertas_ativos
 ORDER BY vl_relevancia DESC
 FETCH FIRST 5 ROWS ONLY;

PROMPT
PROMPT ---- Histórico (trigger de auditoria) do alerta do elevador ----
SELECT h.tp_evento, h.st_anterior, h.st_novo, h.cd_gravidade_nova,
       h.qt_confirmacoes, h.qt_votos_resolvido, TO_CHAR(h.dt_evento, 'DD/MM HH24:MI') AS quando
  FROM tb_historico_alerta h
  JOIN tb_alerta a ON a.id_alerta = h.id_alerta
 WHERE a.cd_categoria = 'elevador_inoperante'
 ORDER BY h.id_historico;
-- ESPERADO: CRIACAO -> CONFIRMACAO (5 confirmações) -> RESOLUCAO (RESOLVIDO)

PROMPT
PROMPT ---- Ranking Theatro -> Sé por perfil (DIA) ----
SELECT cd_perfil, nr_posicao, nm_rota, vl_geral, vl_acessibilidade, vl_seguranca,
       qt_trechos_criticos, qt_duracao_min
  FROM vw_ranking_rotas
 WHERE nm_origem = 'Theatro Municipal' AND nm_destino = 'Catedral da Sé' AND tp_periodo = 'DIA'
 ORDER BY cd_perfil, nr_posicao;

PROMPT
PROMPT ---- Os 5 trechos menos acessíveis para cadeirante (função fn_nota_trecho) ----
SELECT cd_trecho, nm_logradouro, ds_ponto_inicial || ' -> ' || ds_ponto_final AS trecho,
       pkg_rotas_acessiveis.fn_nota_trecho(id_trecho, 'cadeirante', 'DIA', 'A') AS nota_acessibilidade,
       pkg_rotas_acessiveis.fn_nota_trecho(id_trecho, 'cadeirante', 'DIA', 'G') AS nota_geral
  FROM tb_trecho
 ORDER BY nota_acessibilidade
 FETCH FIRST 5 ROWS ONLY;

PROMPT
PROMPT ---- Indicadores do dia por bairro ----
SELECT nm_bairro, qt_alertas_ativos, qt_alertas_graves, qt_resolvidos_30d,
       vl_tempo_medio_resolucao_h, qt_pedidos_apoio_30d, cd_categoria_predominante
  FROM tb_indicador_bairro
 WHERE dt_referencia = TRUNC(SYSDATE)
 ORDER BY qt_alertas_graves DESC, qt_alertas_ativos DESC, nm_bairro;

PROMPT
PROMPT ---- Fila de pedidos de apoio em aberto ----
SELECT id_pedido, tp_pedido, st_atendimento, nm_cidadao, nm_perfil, nm_rota, qt_minutos_aguardando
  FROM vw_pedidos_em_aberto
 ORDER BY CASE tp_pedido WHEN 'EMERGENCIA' THEN 0 ELSE 1 END, dt_pedido;
-- ESPERADO: a emergência da Carla M. primeiro, depois o apoio da Ana P. (o do Demo já foi concluído)

PROMPT
PROMPT ---- Participação: votos por cidadão ----
SELECT c.nm_exibicao,
       SUM(CASE WHEN v.tp_voto = 'CONFIRMOU' THEN 1 ELSE 0 END) AS confirmacoes,
       SUM(CASE WHEN v.tp_voto = 'RESOLVEU'  THEN 1 ELSE 0 END) AS resolucoes
  FROM tb_voto_alerta v
  JOIN tb_cidadao c ON c.id_cidadao = v.id_cidadao
 GROUP BY c.nm_exibicao
 ORDER BY c.nm_exibicao;
