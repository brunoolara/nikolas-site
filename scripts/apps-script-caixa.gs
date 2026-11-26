// Programa do Google (Apps Script) que leva os fechamentos de caixa da Takeat
// para o painel. Roda na conta nikolas@nikolasrestaurante.com.br, a cada 5
// minutos: procura os e-mails "Conferência de caixa" de naoresponda@takeat.app
// ainda não enviados, manda cada um para o painel e marca a conversa com a
// etiqueta "painel-caixa" para não mandar de novo.
//
// Como instalar (uma vez): script.google.com, logado como nikolas@ → Novo
// projeto → apagar o que vier → colar este arquivo → trocar COLE_A_SENHA pela
// senha CAIXA_SECRET da Vercel → salvar → escolher "instalar" na lista de
// funções → Executar → autorizar. A cópia com a senha preenchida fica fora do
// repositório (Desktop\Nikolas\Painel).

const PAINEL = "https://www.nikolasrestaurante.com.br/api/caixa/fechamento";
const SEGREDO = "COLE_A_SENHA";
const ETIQUETA = "painel-caixa";

function enviarFechamentos() {
  const etiqueta = GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
  const busca = 'from:naoresponda@takeat.app subject:"Conferência de caixa" newer_than:3d -label:' + ETIQUETA;
  const conversas = GmailApp.search(busca, 0, 20);
  for (const conversa of conversas) {
    let tudoCerto = true;
    for (const msg of conversa.getMessages()) {
      if (msg.getFrom().indexOf("naoresponda@takeat.app") < 0) continue;
      if (msg.getSubject().indexOf("Conferência de caixa") < 0) continue;
      const resposta = UrlFetchApp.fetch(PAINEL, {
        method: "post",
        contentType: "application/json",
        headers: { "x-caixa-secret": SEGREDO },
        payload: JSON.stringify({ id: msg.getId(), assunto: msg.getSubject(), html: msg.getBody() }),
        muteHttpExceptions: true,
      });
      if (resposta.getResponseCode() !== 200) {
        tudoCerto = false;
        console.error("O painel respondeu " + resposta.getResponseCode() + " para " + msg.getSubject());
      }
    }
    // só marca quando o painel recebeu: se falhou, tenta de novo daqui a 5 minutos
    if (tudoCerto) conversa.addLabel(etiqueta);
  }
}

/** Liga o relógio de 5 em 5 minutos (apaga o anterior, se houver) e já roda uma vez. */
function instalar() {
  for (const gatilho of ScriptApp.getProjectTriggers()) {
    if (gatilho.getHandlerFunction() === "enviarFechamentos") ScriptApp.deleteTrigger(gatilho);
  }
  ScriptApp.newTrigger("enviarFechamentos").timeBased().everyMinutes(5).create();
  enviarFechamentos();
}
