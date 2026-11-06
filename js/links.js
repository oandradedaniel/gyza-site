/* GYZA, página de links (gyza.com.br/links): conta o clique em cada botão pela medição sem cookie (js/metricas.js)
   e acompanha o dedo ou o mouse com um brilho suave nos botões (só efeito visual). */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-link]');
  if (a && window.gyzaMetrica) window.gyzaMetrica('clique_link', a.getAttribute('data-link'));
});
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('pointermove', function (e) {
    var a = e.target.closest && e.target.closest('.btn');
    if (!a) return;
    var r = a.getBoundingClientRect();
    a.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    a.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
})();
