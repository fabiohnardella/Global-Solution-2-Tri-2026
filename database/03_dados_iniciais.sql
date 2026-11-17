/* =============================================================================
   ROTAS ACESSÍVEIS SP — Global Solution 2 (CitizenTech)
   Script 03 — Dados iniciais (os MESMOS do aplicativo: src/data/*.ts)
   Locais e vias reais do centro de São Paulo; métricas são estimativas de demonstração.
   Pré-requisitos: 01_ddl.sql e 02_plsql.sql
   ============================================================================= */

SET SERVEROUTPUT ON;
SET DEFINE OFF;

/* ---------------------------- 1. Catálogos -------------------------------- */

INSERT INTO tb_perfil_mobilidade (cd_perfil, nm_perfil, ds_perfil, vl_velocidade_mps, vl_peso_rampa, vl_peso_piso_tatil, vl_peso_largura, vl_peso_inclinacao, vl_peso_acessibilidade, vl_inclinacao_max_pct, vl_largura_min_m)
VALUES ('cadeirante', 'Cadeirante / mobilidade reduzida', 'Prioriza rampas, calçadas largas e pouca inclinação.', 0.9, 0.35, 0.05, 0.3, 0.3, 0.65, 8.33, 1.2);
INSERT INTO tb_perfil_mobilidade (cd_perfil, nm_perfil, ds_perfil, vl_velocidade_mps, vl_peso_rampa, vl_peso_piso_tatil, vl_peso_largura, vl_peso_inclinacao, vl_peso_acessibilidade, vl_inclinacao_max_pct, vl_largura_min_m)
VALUES ('deficiencia_visual', 'Pessoa com deficiência visual', 'Prioriza piso tátil contínuo e trechos sem obstáculos.', 0.85, 0.1, 0.5, 0.25, 0.15, 0.6, 12, 1.2);
INSERT INTO tb_perfil_mobilidade (cd_perfil, nm_perfil, ds_perfil, vl_velocidade_mps, vl_peso_rampa, vl_peso_piso_tatil, vl_peso_largura, vl_peso_inclinacao, vl_peso_acessibilidade, vl_inclinacao_max_pct, vl_largura_min_m)
VALUES ('idoso', 'Pessoa idosa', 'Prioriza piso regular, pouca ladeira e boa iluminação.', 0.9, 0.25, 0.1, 0.25, 0.4, 0.5, 8.33, 1.2);
INSERT INTO tb_perfil_mobilidade (cd_perfil, nm_perfil, ds_perfil, vl_velocidade_mps, vl_peso_rampa, vl_peso_piso_tatil, vl_peso_largura, vl_peso_inclinacao, vl_peso_acessibilidade, vl_inclinacao_max_pct, vl_largura_min_m)
VALUES ('pedestre', 'Pedestre', 'Equilíbrio entre segurança, tempo e conforto.', 1.3, 0.25, 0.25, 0.25, 0.25, 0.4, 15, 0.9);

INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('calcada_quebrada', 'Calçada quebrada', 'Buracos, desníveis, pedras soltas ou piso afundado.', 1, 0.3);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('falta_rampa', 'Falta de rampa', 'Esquina ou travessia sem rampa, ou rampa bloqueada.', 1, 0);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('piso_tatil_danificado', 'Piso tátil danificado', 'Piso tátil ausente, descolado ou levando a obstáculo.', 1, 0);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('poste_apagado', 'Poste apagado', 'Iluminação pública apagada ou muito fraca.', 0.1, 1);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('alagamento', 'Alagamento', 'Água acumulada que impede ou arrisca a passagem.', 0.8, 0.6);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('obra_sem_sinalizacao', 'Obra sem sinalização', 'Obra sem tapume, sem rota alternativa ou sem aviso.', 0.8, 0.7);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('elevador_inoperante', 'Elevador parado', 'Elevador ou plataforma de estação/passarela fora de uso.', 1, 0);
INSERT INTO tb_categoria_barreira (cd_categoria, nm_categoria, ds_categoria, vl_impacto_acessibilidade, vl_impacto_seguranca)
VALUES ('obstaculo_calcada', 'Obstáculo na calçada', 'Carro, mesas, entulho, raiz de árvore ou lixo bloqueando.', 0.9, 0.2);

INSERT INTO tb_gravidade (cd_gravidade, nm_gravidade, ds_gravidade, nr_ordem, vl_peso_relevancia, vl_penalidade)
VALUES ('baixa', 'Baixa', 'Incomoda, mas dá para passar com atenção.', 1, 25, 6);
INSERT INTO tb_gravidade (cd_gravidade, nm_gravidade, ds_gravidade, nr_ordem, vl_peso_relevancia, vl_penalidade)
VALUES ('media', 'Média', 'Exige desvio ou muito cuidado.', 2, 50, 14);
INSERT INTO tb_gravidade (cd_gravidade, nm_gravidade, ds_gravidade, nr_ordem, vl_peso_relevancia, vl_penalidade)
VALUES ('alta', 'Alta', 'Impede a passagem de cadeira de rodas, andador ou bengala.', 3, 75, 25);
INSERT INTO tb_gravidade (cd_gravidade, nm_gravidade, ds_gravidade, nr_ordem, vl_peso_relevancia, vl_penalidade)
VALUES ('critica', 'Crítica', 'Risco imediato à integridade de quem passa.', 4, 100, 40);

-- Multiplicador de penalidade por perfil (categoria ausente = 1,0)
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'falta_rampa', 1.6);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'elevador_inoperante', 1.7);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'calcada_quebrada', 1.3);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'obstaculo_calcada', 1.3);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'piso_tatil_danificado', 0.3);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('cadeirante', 'poste_apagado', 0.8);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('deficiencia_visual', 'piso_tatil_danificado', 1.8);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('deficiencia_visual', 'obstaculo_calcada', 1.6);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('deficiencia_visual', 'obra_sem_sinalizacao', 1.6);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('deficiencia_visual', 'calcada_quebrada', 1.2);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('deficiencia_visual', 'falta_rampa', 0.6);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('idoso', 'calcada_quebrada', 1.5);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('idoso', 'alagamento', 1.4);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('idoso', 'poste_apagado', 1.3);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('idoso', 'obstaculo_calcada', 1.2);
INSERT INTO tb_perfil_sensibilidade (cd_perfil, cd_categoria, vl_multiplicador) VALUES ('idoso', 'elevador_inoperante', 1.3);

/* ---------------------------- 2. Cidadãos --------------------------------- */
-- "Cidadão Demo" representa o usuário do app nos testes; os demais são autores
-- dos alertas iniciais e voluntários usados na demonstração da votação.
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Cidadão Demo', 'cadeirante', SYSDATE - 0);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Ana P.', 'cadeirante', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('João R.', 'deficiencia_visual', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Coletivo Calçada Viva', 'pedestre', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Dona Lourdes', 'idoso', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Marcos T.', 'pedestre', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Beatriz L.', 'idoso', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Rafael S.', 'deficiencia_visual', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Carla M.', 'cadeirante', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Pedro H.', 'pedestre', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Guilherme A.', 'pedestre', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Luana F.', 'deficiencia_visual', SYSDATE - 30);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Voluntário Teste 1', 'pedestre', SYSDATE - 1);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Voluntária Teste 2', 'idoso', SYSDATE - 1);
INSERT INTO tb_cidadao (nm_exibicao, cd_perfil, dt_cadastro) VALUES ('Voluntário Teste 3', 'deficiencia_visual', SYSDATE - 1);

/* ------------------------- 3. Locais e trechos ---------------------------- */

INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('consolacao', 'Estação Consolação (Metrô Linha 2-Verde)', 'Est. Consolação', 'Av. Paulista, 2163 – Consolação', 'Consolação', -23.5575, -46.6608, 'Acessos com elevador nos dois lados da Av. Paulista.');
INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('hc', 'Hospital das Clínicas – FMUSP', 'Hospital das Clínicas', 'Av. Dr. Enéas Carvalho de Aguiar, 255 – Cerqueira César', 'Cerqueira César', -23.5573, -46.6696, 'Portaria principal com rampa e balcão de informações à direita.');
INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('masp', 'MASP – Museu de Arte de São Paulo', 'MASP', 'Av. Paulista, 1578 – Bela Vista', 'Bela Vista', -23.5614, -46.6559, 'Entrada pelo vão livre; elevador de acesso ao lado da bilheteria.');
INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('ccsp', 'Centro Cultural São Paulo', 'CCSP', 'Rua Vergueiro, 1000 – Paraíso', 'Paraíso', -23.5712, -46.6395, 'Entrada principal em nível, com rampa até o piso das bibliotecas.');
INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('theatro', 'Theatro Municipal de São Paulo', 'Theatro Municipal', 'Praça Ramos de Azevedo, s/n – República', 'República', -23.5452, -46.6386, 'Entrada acessível pela lateral, com rampa e elevador.');
INSERT INTO tb_local (cd_local, nm_local, nm_curto, ds_endereco, nm_bairro, vl_latitude, vl_longitude, ds_dica_chegada)
VALUES ('se', 'Catedral da Sé', 'Catedral da Sé', 'Praça da Sé, s/n – Sé', 'Sé', -23.5503, -46.634, 'Rampa lateral à escadaria principal da catedral.');

INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s01', 'Av. Paulista', 'CALCADA', 'Estação Consolação', 'Praça Mal. Cordeiro de Farias', 'Consolação', 450, NULL, 0.9, 0.85, 4.5, 1.5, 0.95, 0.95, 6, 'Calçada larga com piso tátil contínuo e semáforo sonoro na Rua da Consolação.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s02', 'Av. Dr. Arnaldo', 'CALCADA', 'Praça Mal. Cordeiro de Farias', 'Av. Dr. Enéas Carvalho de Aguiar', 'Cerqueira César', 600, NULL, 0.55, 0.35, 1.6, 6.5, 0.7, 0.6, 4, 'Trecho em declive com calçada estreita junto ao muro do Cemitério do Araçá.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s03', 'Av. Dr. Enéas Carvalho de Aguiar', 'CALCADA', 'Av. Dr. Arnaldo', 'Portaria principal do HC', 'Cerqueira César', 300, NULL, 0.85, 0.7, 2.5, 3, 0.85, 0.9, 2, 'Rampas nas faixas de pedestre e grande fluxo de pessoas perto da portaria.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s04', 'Rua da Consolação', 'CALCADA', 'Av. Paulista', 'Rua Oscar Freire', 'Consolação', 450, NULL, 0.6, 0.4, 2, 4, 0.85, 0.8, 7, 'Calçada movimentada com comércio; atenção a mesas e placas na faixa livre.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s05', 'Rua Oscar Freire', 'CALCADA', 'Rua da Consolação', 'Av. Rebouças', 'Jardins', 800, NULL, 0.95, 0.9, 3, 2.5, 0.9, 0.75, 2, 'Calçadas requalificadas, niveladas e com piso tátil em toda a extensão.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s06', 'Av. Rebouças', 'CALCADA', 'Rua Oscar Freire', 'Av. Dr. Enéas Carvalho de Aguiar', 'Pinheiros', 500, NULL, 0.5, 0.3, 1.8, 2, 0.75, 0.55, 5, 'Avenida de tráfego intenso; atravesse somente nas faixas com semáforo.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s07', 'Metrô Linha 2-Verde', 'METRO', 'Estação Consolação', 'Estação Clínicas', 'Consolação', 1100, 6, 1, 1, 3, 0, 1, 0.9, 1, 'Elevadores até a plataforma; peça apoio aos agentes do Metrô se precisar.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s08', 'Av. Dr. Arnaldo', 'CALCADA', 'Estação Clínicas', 'Portaria principal do HC', 'Cerqueira César', 350, NULL, 0.8, 0.75, 2.2, 3.5, 0.85, 0.85, 2, 'Saída da estação voltada ao complexo hospitalar; siga a faixa de piso tátil.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s09', 'Av. Paulista', 'CALCADA', 'MASP', 'Al. Joaquim Eugênio de Lima', 'Bela Vista', 400, NULL, 0.95, 0.9, 5, 1, 0.95, 1, 5, 'Calçada larga e plana; ciclovia no canteiro central, atravesse só na faixa.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s10', 'Av. Paulista', 'CALCADA', 'Al. Joaquim Eugênio de Lima', 'Av. Brigadeiro Luís Antônio', 'Bela Vista', 450, NULL, 0.9, 0.6, 4.5, 1.5, 0.9, 0.95, 8, 'Saída da Estação Brigadeiro com fluxo intenso nos horários de pico.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s11', 'Av. Paulista', 'CALCADA', 'Av. Brigadeiro Luís Antônio', 'Praça Oswaldo Cruz', 'Paraíso', 800, NULL, 0.85, 0.8, 4, 2, 0.85, 0.8, 4, 'Trecho final da Paulista; travessia da Praça Oswaldo Cruz com semáforo sonoro.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s12', 'Rua Vergueiro', 'CALCADA', 'Praça Oswaldo Cruz', 'Centro Cultural São Paulo', 'Paraíso', 550, NULL, 0.6, 0.5, 2, 4, 0.7, 0.6, 6, 'Calçada com desníveis pontuais; a entrada do CCSP tem rampa.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s13', 'Al. Joaquim Eugênio de Lima', 'CALCADA', 'Av. Paulista', 'Alameda Santos', 'Jardim Paulista', 150, NULL, 0.7, 0.3, 1.8, 5, 0.8, 0.6, 1, 'Quarteirão curto em leve descida.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s14', 'Alameda Santos', 'CALCADA', 'Al. Joaquim Eugênio de Lima', 'Rua Teixeira da Silva', 'Jardim Paulista', 1200, NULL, 0.75, 0.55, 2.2, 2, 0.65, 0.45, 3, 'Rua paralela à Paulista, mais tranquila; pouco movimento à noite.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s15', 'Rua Teixeira da Silva', 'CALCADA', 'Alameda Santos', 'Praça Oswaldo Cruz', 'Paraíso', 250, NULL, 0.5, 0.2, 1.4, 7, 0.6, 0.4, 2, 'Ladeira curta com calçada estreita.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s16', 'Metrô Linha 2-Verde', 'METRO', 'Estação Trianon-MASP', 'Estação Paraíso', 'Bela Vista', 2000, 8, 1, 1, 3, 0, 1, 0.9, 1, 'Acesso por elevador; na Paraíso, siga a sinalização para a Rua Vergueiro.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s17', 'Av. Paulista', 'CALCADA', 'MASP', 'Estação Trianon-MASP', 'Bela Vista', 100, NULL, 0.95, 0.9, 5, 1, 0.95, 1, 3, 'O acesso da estação fica do outro lado da avenida; use a faixa com semáforo.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s18', 'Rua Vergueiro', 'CALCADA', 'Estação Paraíso', 'Centro Cultural São Paulo', 'Paraíso', 400, NULL, 0.7, 0.6, 2.2, 3, 0.75, 0.65, 4, 'Calçada regular até a entrada do CCSP.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s19', 'Viaduto do Chá', 'CALCADAO', 'Praça Ramos de Azevedo', 'Praça do Patriarca', 'Centro', 350, NULL, 0.9, 0.7, 6, 1, 0.7, 0.85, 12, 'Passeio largo sobre o Vale do Anhangabaú; atenção a ambulantes.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s20', 'Rua Direita', 'CALCADAO', 'Praça do Patriarca', 'Praça da Sé', 'Centro', 450, NULL, 0.6, 0.35, 7, 2, 0.6, 0.95, 15, 'Calçadão de pedra portuguesa com trechos irregulares e movimento intenso.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s21', 'Vale do Anhangabaú', 'CALCADAO', 'Theatro Municipal', 'Largo São Bento', 'Centro', 550, NULL, 0.85, 0.75, 10, 3, 0.55, 0.5, 10, 'Área reformada com piso nivelado; pouco movimento à noite.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s22', 'Rua São Bento', 'CALCADAO', 'Largo São Bento', 'Praça Antônio Prado', 'Centro', 250, NULL, 0.55, 0.3, 6, 2, 0.65, 0.85, 9, 'Calçadão comercial; mantenha-se pelo centro da via.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s23', 'Rua XV de Novembro', 'CALCADAO', 'Praça Antônio Prado', 'Praça da Sé', 'Centro', 400, NULL, 0.6, 0.4, 6, 3, 0.7, 0.85, 8, 'Calçadão histórico; desníveis perto das portas dos bancos.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s24', 'Rua Cel. Xavier de Toledo', 'CALCADA', 'Theatro Municipal', 'Estação Anhangabaú', 'República', 200, NULL, 0.7, 0.5, 2.5, 4, 0.75, 0.8, 7, 'Acesso à estação por elevador na calçada.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s25', 'Metrô Linha 3-Vermelha', 'METRO', 'Estação Anhangabaú', 'Estação Sé', 'Centro', 900, 6, 1, 1, 3, 0, 1, 0.85, 3, 'Na Sé há baldeação com a Linha 1-Azul; siga o piso tátil até a saída da Praça.');
INSERT INTO tb_trecho (cd_trecho, nm_logradouro, tp_trecho, ds_ponto_inicial, ds_ponto_final, nm_bairro, vl_distancia_m, qt_duracao_fixa_min, vl_cobertura_rampa, vl_cobertura_piso_tatil, vl_largura_calcada_m, vl_inclinacao_pct, vl_iluminacao, vl_fluxo_pedestres, qt_ocorrencias_90d, ds_orientacao)
VALUES ('s26', 'Praça da Sé', 'CALCADAO', 'Estação Sé', 'Catedral da Sé', 'Sé', 150, NULL, 0.8, 0.6, 15, 1, 0.5, 0.9, 18, 'Praça ampla; mantenha-se nas áreas iluminadas e movimentadas.');

/* ------------------------ 4. Rotas e sequência ---------------------------- */
DECLARE
  PROCEDURE add_rota (p_cd VARCHAR2, p_nome VARCHAR2, p_resumo VARCHAR2,
                      p_origem VARCHAR2, p_destino VARCHAR2) IS
  BEGIN
    INSERT INTO tb_rota (cd_rota, nm_rota, ds_resumo, id_local_origem, id_local_destino)
    SELECT p_cd, p_nome, p_resumo, o.id_local, d.id_local
      FROM tb_local o, tb_local d
     WHERE o.cd_local = p_origem AND d.cd_local = p_destino;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20099, 'Seed inválido (rota ' || p_cd || ')');
    END IF;
  END add_rota;

  PROCEDURE add_passo (p_rota VARCHAR2, p_ordem NUMBER, p_trecho VARCHAR2, p_inverso CHAR) IS
  BEGIN
    INSERT INTO tb_rota_trecho (id_rota, nr_ordem, id_trecho, st_sentido_inverso)
    SELECT r.id_rota, p_ordem, t.id_trecho, p_inverso
      FROM tb_rota r, tb_trecho t
     WHERE r.cd_rota = p_rota AND t.cd_trecho = p_trecho;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20099, 'Seed inválido (passo ' || p_rota || '/' || p_trecho || ')');
    END IF;
  END add_passo;
BEGIN
  add_rota('r01', 'Pela Av. Dr. Arnaldo', 'Caminho mais direto, com trecho em declive e calçada estreita.', 'consolacao', 'hc');
  add_rota('r02', 'Pela Rua Oscar Freire', 'Mais longa, mas com calçadas requalificadas e piso tátil.', 'consolacao', 'hc');
  add_rota('r03', 'Metrô Linha 2 até Clínicas', 'Uma estação de metrô com elevadores e caminhada curta.', 'consolacao', 'hc');
  add_rota('r04', 'Pela Av. Paulista', 'Calçadas largas e muito movimento até a Praça Oswaldo Cruz.', 'masp', 'ccsp');
  add_rota('r05', 'Pela Alameda Santos', 'Rua paralela mais calma, com ladeira curta no final.', 'masp', 'ccsp');
  add_rota('r06', 'Metrô Trianon-MASP → Paraíso', 'Três estações de metrô e caminhada curta pela Vergueiro.', 'masp', 'ccsp');
  add_rota('r07', 'Viaduto do Chá e Rua Direita', 'Caminho clássico pelos calçadões, com muito movimento.', 'theatro', 'se');
  add_rota('r08', 'Vale do Anhangabaú e Rua XV', 'Piso reformado no Vale; menos movimento à noite.', 'theatro', 'se');
  add_rota('r09', 'Metrô Linha 3: Anhangabaú → Sé', 'Uma estação de metrô; saída pela Praça da Sé.', 'theatro', 'se');

  add_passo('r01', 1, 's01', 'N');
  add_passo('r01', 2, 's02', 'N');
  add_passo('r01', 3, 's03', 'N');
  add_passo('r02', 1, 's04', 'N');
  add_passo('r02', 2, 's05', 'N');
  add_passo('r02', 3, 's06', 'N');
  add_passo('r02', 4, 's03', 'N');
  add_passo('r03', 1, 's07', 'N');
  add_passo('r03', 2, 's08', 'N');
  add_passo('r04', 1, 's09', 'N');
  add_passo('r04', 2, 's10', 'N');
  add_passo('r04', 3, 's11', 'N');
  add_passo('r04', 4, 's12', 'N');
  add_passo('r05', 1, 's09', 'N');
  add_passo('r05', 2, 's13', 'N');
  add_passo('r05', 3, 's14', 'N');
  add_passo('r05', 4, 's15', 'N');
  add_passo('r05', 5, 's12', 'N');
  add_passo('r06', 1, 's17', 'N');
  add_passo('r06', 2, 's16', 'N');
  add_passo('r06', 3, 's18', 'N');
  add_passo('r07', 1, 's19', 'N');
  add_passo('r07', 2, 's20', 'N');
  add_passo('r08', 1, 's21', 'N');
  add_passo('r08', 2, 's22', 'N');
  add_passo('r08', 3, 's23', 'N');
  add_passo('r09', 1, 's24', 'N');
  add_passo('r09', 2, 's25', 'N');
  add_passo('r09', 3, 's26', 'N');
END;
/

/* ------------------------- 5. Alertas da comunidade ----------------------- */
-- Horas são relativas ao momento da carga, para os alertas sempre parecerem recentes.
-- Os contadores incluem votos históricos (anteriores ao app), por isso não há
-- uma linha em TB_VOTO_ALERTA para cada confirmação desses alertas iniciais.
DECLARE
  PROCEDURE add_alerta (p_trecho VARCHAR2, p_categoria VARCHAR2, p_gravidade VARCHAR2,
                        p_autor VARCHAR2, p_referencia VARCHAR2, p_descricao VARCHAR2,
                        p_confirmacoes NUMBER, p_resolvidos NUMBER, p_status VARCHAR2,
                        p_horas_criacao NUMBER, p_horas_confirmacao NUMBER,
                        p_horas_resolucao NUMBER DEFAULT NULL) IS
  BEGIN
    INSERT INTO tb_alerta (id_trecho, cd_categoria, cd_gravidade, id_cidadao_autor,
                           ds_referencia, ds_descricao, dt_criacao, dt_ultima_confirmacao,
                           dt_atualizacao, qt_confirmacoes, qt_votos_resolvido, st_alerta, dt_resolucao)
    SELECT t.id_trecho, p_categoria, p_gravidade, c.id_cidadao,
           p_referencia, p_descricao,
           SYSDATE - p_horas_criacao / 24,
           SYSDATE - p_horas_confirmacao / 24,
           SYSDATE - LEAST(p_horas_confirmacao, NVL(p_horas_resolucao, p_horas_confirmacao)) / 24,
           p_confirmacoes, p_resolvidos, p_status,
           CASE WHEN p_horas_resolucao IS NOT NULL THEN SYSDATE - p_horas_resolucao / 24 END
      FROM tb_trecho t, tb_cidadao c
     WHERE t.cd_trecho = p_trecho AND c.nm_exibicao = p_autor;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20099, 'Seed inválido (alerta em ' || p_trecho || ' por ' || p_autor || ')');
    END IF;
  END add_alerta;
BEGIN
  add_alerta('s02', 'falta_rampa', 'alta', 'Ana P.',
             'Esquina com a Rua Cardeal Arcoverde',
             'Rampa interditada por obra da concessionária. Cadeirantes precisam descer pela rua.',
             7, 0, 'ATIVO', 52, 3);
  add_alerta('s10', 'piso_tatil_danificado', 'media', 'João R.',
             'Saída da Estação Brigadeiro, lado ímpar',
             'Piso tátil descolado por cerca de 10 metros; a linha guia some perto da banca.',
             4, 1, 'ATIVO', 120, 30);
  add_alerta('s19', 'poste_apagado', 'alta', 'Coletivo Calçada Viva',
             'Meio do viaduto, sentido Patriarca',
             'Três postes seguidos apagados. Trecho fica escuro depois das 18h.',
             9, 0, 'ATIVO', 26, 5);
  add_alerta('s20', 'calcada_quebrada', 'alta', 'Dona Lourdes',
             'Em frente ao nº 180',
             'Pedras portuguesas soltas formando um buraco de uns 40 cm.',
             12, 0, 'ATIVO', 75, 2);
  add_alerta('s06', 'alagamento', 'critica', 'Marcos T.',
             'Próximo ao cruzamento com a Rua Oscar Freire',
             'Alagamento recorrente após chuva forte; a água cobre a calçada inteira.',
             5, 1, 'ATIVO', 6, 1);
  add_alerta('s14', 'obstaculo_calcada', 'media', 'Beatriz L.',
             'Entre a Rua Pamplona e a Rua Carlos Sampaio',
             'Raiz de árvore levantou a calçada; sobra menos de 80 cm de passagem.',
             3, 0, 'ATIVO', 240, 60);
  add_alerta('s12', 'obra_sem_sinalizacao', 'alta', 'Rafael S.',
             'Perto do nº 700',
             'Vala aberta sem tapume nem sinalização tátil; passagem pela rua.',
             6, 0, 'ATIVO', 22, 4);
  add_alerta('s25', 'elevador_inoperante', 'critica', 'Carla M.',
             'Estação Sé – elevador da saída Praça da Sé',
             'Elevador fora de operação. Use o acesso da Rua Roberto Simonsen ou peça apoio.',
             4, 0, 'ATIVO', 4, 1);
  add_alerta('s21', 'poste_apagado', 'media', 'Pedro H.',
             'Perto da escadaria do Largo São Bento',
             'Iluminação fraca perto da escadaria.',
             2, 2, 'ATIVO', 480, 300);
  add_alerta('s23', 'calcada_quebrada', 'baixa', 'Guilherme A.',
             'Em frente à agência bancária da esquina',
             'Tampa de bueiro desnivelada uns 3 cm.',
             1, 0, 'ATIVO', 190, 190);
  add_alerta('s04', 'obstaculo_calcada', 'baixa', 'Luana F.',
             'Quarteirão entre a Al. Santos e a Al. Jaú',
             'Mesas de bar ocupando metade da calçada à noite.',
             3, 0, 'ATIVO', 48, 20);
  add_alerta('s15', 'falta_rampa', 'media', 'Ana P.',
             'Esquina com a Praça Oswaldo Cruz',
             'Esquina sem rebaixamento de guia.',
             2, 0, 'ATIVO', 360, 150);
  add_alerta('s01', 'piso_tatil_danificado', 'media', 'João R.',
             'Frente ao Conjunto Nacional',
             'Piso tátil reposto pela subprefeitura.',
             3, 5, 'RESOLVIDO', 720, 600, 96);
END;
/

/* ------------------------ 6. Pedidos de apoio (histórico) ----------------- */
INSERT INTO tb_pedido_apoio (id_cidadao, id_rota, id_trecho, tp_pedido, ds_localizacao,
                             st_atendimento, dt_pedido, dt_inicio_atendimento, dt_conclusao, ds_observacao)
SELECT c.id_cidadao, r.id_rota, t.id_trecho, 'APOIO',
       'Rua Direita (Praça do Patriarca -> Praça da Sé)',
       'CONCLUIDO', SYSDATE - 5, SYSDATE - 5 + 10/1440, SYSDATE - 5 + 35/1440,
       'Agente da subprefeitura acompanhou até a Praça da Sé.'
  FROM tb_cidadao c, tb_rota r, tb_trecho t
 WHERE c.nm_exibicao = 'Dona Lourdes' AND r.cd_rota = 'r07' AND t.cd_trecho = 's20';

INSERT INTO tb_pedido_apoio (id_cidadao, id_rota, id_trecho, tp_pedido, ds_localizacao,
                             st_atendimento, dt_pedido, dt_inicio_atendimento)
SELECT c.id_cidadao, r.id_rota, t.id_trecho, 'APOIO',
       'Av. Dr. Arnaldo (Praça Mal. Cordeiro de Farias -> Av. Dr. Enéas Carvalho de Aguiar)',
       'EM_ATENDIMENTO', SYSDATE - 20/1440, SYSDATE - 12/1440
  FROM tb_cidadao c, tb_rota r, tb_trecho t
 WHERE c.nm_exibicao = 'Ana P.' AND r.cd_rota = 'r01' AND t.cd_trecho = 's02';

INSERT INTO tb_pedido_apoio (id_cidadao, id_rota, id_trecho, tp_pedido, ds_localizacao, dt_pedido)
SELECT c.id_cidadao, r.id_rota, t.id_trecho, 'EMERGENCIA',
       'Estação Sé (Metrô Linha 3-Vermelha)', SYSDATE - 8/1440
  FROM tb_cidadao c, tb_rota r, tb_trecho t
 WHERE c.nm_exibicao = 'Carla M.' AND r.cd_rota = 'r09' AND t.cd_trecho = 's25';

COMMIT;

/* ------------------- 7. Cálculos iniciais (rotinas PL/SQL) ---------------- */
BEGIN
  pkg_rotas_acessiveis.pr_recalcular_rotas;   -- notas de todas as rotas x perfis x períodos
  pkg_rotas_acessiveis.pr_gerar_indicadores;  -- indicadores do dia por bairro
END;
/

/* ------------------------------- Conferência ------------------------------ */
SELECT 'Perfis'            AS tabela, COUNT(*) AS registros FROM tb_perfil_mobilidade    UNION ALL
SELECT 'Categorias',                  COUNT(*)              FROM tb_categoria_barreira   UNION ALL
SELECT 'Gravidades',                  COUNT(*)              FROM tb_gravidade            UNION ALL
SELECT 'Sensibilidades',              COUNT(*)              FROM tb_perfil_sensibilidade UNION ALL
SELECT 'Cidadãos',                    COUNT(*)              FROM tb_cidadao              UNION ALL
SELECT 'Locais',                      COUNT(*)              FROM tb_local                UNION ALL
SELECT 'Trechos',                     COUNT(*)              FROM tb_trecho               UNION ALL
SELECT 'Rotas',                       COUNT(*)              FROM tb_rota                 UNION ALL
SELECT 'Passos de rota',              COUNT(*)              FROM tb_rota_trecho          UNION ALL
SELECT 'Alertas',                     COUNT(*)              FROM tb_alerta               UNION ALL
SELECT 'Histórico (trigger)',         COUNT(*)              FROM tb_historico_alerta     UNION ALL
SELECT 'Pedidos de apoio',            COUNT(*)              FROM tb_pedido_apoio         UNION ALL
SELECT 'Avaliações de rota',          COUNT(*)              FROM tb_avaliacao_rota       UNION ALL
SELECT 'Indicadores (bairros)',       COUNT(*)              FROM tb_indicador_bairro;
-- Esperado: 4, 8, 4, 16, 15, 6, 26, 9, 29, 13, 13, 3, 72, 10
