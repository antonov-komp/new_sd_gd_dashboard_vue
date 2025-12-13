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
          const labelX = x + 6; // Отступ справа от точки
          const labelY = y - 4; // Небольшое смещение вверх
          
          // Форматирование значения (целое число без десятичных знаков)
          const labelText = String(Math.round(value));
          
          // Сохранение состояния контекста
          ctx.save();
          
          try {
            // Измерение текста для правильного размера фона
            ctx.font = '10px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;
            const textHeight = 10; // Высота текста
            
            // Отрисовка фона для читаемости
            const padding = 2;
            const bgX = labelX - padding;
            const bgY = labelY - textHeight / 2 - padding;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = textHeight + padding * 2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Белый фон с прозрачностью
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            
            // Отрисовка текста
            ctx.fillStyle = pointColor;
            ctx.font = '10px Arial, sans-serif';
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
