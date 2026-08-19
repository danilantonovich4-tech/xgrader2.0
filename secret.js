(function(){
  var img = document.querySelector('[data-id="secretPhoto"]');
  var snd = document.querySelector('[data-id="secretSound"]');
  if (!img || !snd) return;
  img.addEventListener('mouseenter', function(){ img.style.opacity = '.9'; img.style.transform = 'scale(1.05)'; });
  img.addEventListener('mouseleave', function(){ img.style.opacity = '.5'; img.style.transform = 'scale(1)'; });
  img.addEventListener('click', function(){
    snd.currentTime = 0;
    snd.play().catch(function(err){ console.warn('Не удалось воспроизвести звук:', err); });
  });
})();