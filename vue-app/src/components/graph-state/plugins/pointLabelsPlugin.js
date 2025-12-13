/**
 * Плагин Chart.js для отрисовки подписей значений рядом с точками графика
 * 
 * Плагин отрисовывает числовые значения рядом с каждой точкой линейного графика,
 * делая значения видимыми без необходимости наведения курсора.
 * 
 * @module pointLabelsPlugin
 */

/**
 * Плагин Chart.js для отрисовки подписей значений
 */
export const pointLabelsPlugin = {
  id: 'pointLabelsPlugin',
  
  /**
   * Вызывается после отрисовки всех datasets
   * 
   * В этом методе происходит отрисовка подписей значений рядом с точками.
   * 
   * @param {Object} chart - Экземпляр Chart.js
   */
  afterDatasetsDraw: (chart) => {
    // Проверка типа графика (плагин работает только для линейных графиков)
    if (!chart || !chart.config || chart.config.type !== 'line') {
      return;
    }
    
    // Проверка наличия canvas контекста
    if (!chart.ctx) {
      return;
    }
    
    try {
      const ctx = chart.ctx;
      const datasets = chart.data?.datasets;
      
      if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
        return;
      }
      
      // Проход по всем datasets и точкам
      datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        
        // Пропустить скрытые datasets
        if (!meta || meta.hidden) {
          return;
        }
        
        // Пропустить dataset без данных
        if (!dataset.data || !Array.isArray(dataset.data)) {
          return;
        }
        
        // Получить цвет точки для подписи
        const pointColor = Array.isArray(dataset.pointBackgroundColor)
          ? dataset.pointBackgroundColor[0] || '#6b7280'
          : dataset.pointBackgroundColor || '#6b7280';
        
        // Проход по всем точкам dataset
        dataset.data.forEach((value, dataIndex) => {
          const point = meta.data[dataIndex];
          
          // Пропустить невалидные точки
          if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
            return;
          }
          
          // Пропустить невалидные значения
          if (value === undefined || value === null || isNaN(value)) {
            return;
          }
          
          // Получить смещённые координаты, если они есть (от pointJitterPlugin)
          const x = point._jitteredX !== undefined ? point._jitteredX : point.x;
          const y = point._jitteredY !== undefined ? point._jitteredY : point.y;
          
          // Позиция подписи (справа от точки с небольшим смещением)
          const labelX = x + 8; // Увеличен отступ справа от точки для лучшей видимости (было 6)
          const labelY = y - 5; // Увеличен отступ вверх для лучшей видимости (было 4)
          
          // Форматирование значения (целое число без десятичных знаков)
          const labelText = String(Math.round(value));
          
          // Сохранение состояния контекста
          ctx.save();
          
          try {
            // Измерение текста для правильного размера фона
            ctx.font = '11px Arial, sans-serif'; // Соответствует размеру шрифта при отрисовке
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;
            const textHeight = 11; // Высота текста (соответствует размеру шрифта)
            
            // Отрисовка фона для читаемости
            const padding = 3; // Увеличен padding для лучшей читаемости (было 2)
            const bgX = labelX - padding;
            const bgY = labelY - textHeight / 2 - padding;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = textHeight + padding * 2;
            
            // Улучшенный фон с обводкой для лучшей видимости
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; // Более непрозрачный фон (было 0.8)
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            
            // Добавляем обводку для лучшей видимости
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
            
            // Отрисовка текста
            ctx.fillStyle = pointColor;
            ctx.font = '11px Arial, sans-serif'; // Увеличен размер шрифта для лучшей читаемости (было 10px)
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, labelX, labelY);
            
          } catch (error) {
            console.warn(`pointLabelsPlugin: ошибка при отрисовке подписи для точки ${datasetIndex}_${dataIndex}:`, error);
          } finally {
            ctx.restore();
          }
        });
      });
      
    } catch (error) {
      // Логирование ошибки без прерывания работы графика
      console.warn('pointLabelsPlugin: ошибка в afterDatasetsDraw:', error);
    }
  }
};
