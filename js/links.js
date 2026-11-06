/* GYZA, página de links (gyza.com.br/links): conta o clique em cada botão pela medição sem cookie (js/metricas.js). */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-link]');
  if (a && window.gyzaMetrica) window.gyzaMetrica('clique_link', a.getAttribute('data-link'));
});
