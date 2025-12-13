/**
 * Плагин Chart.js для смещения точек с одинаковыми значениями Y (Jitter)
 * 
 * Плагин анализирует линейный график, находит точки с одинаковыми значениями Y
 * на одной временной позиции и применяет небольшое смещение по оси X для визуального разделения.
 * 
 * @module pointJitterPlugin
 */

import { calculatePointJitter } from '@/utils/graph-state/lineChartUtils.js';

/**
 * Порог для определения одинаковых значений (в единицах Y)
 * Точки считаются одинаковыми, если их значения отличаются менее чем на 0.5
 */
const JITTER_THRESHOLD = 0.5;

/**
 * Плагин Chart.js для смещения точек с одинаковыми значениями Y
 */
export const pointJitterPlugin = {
  id: 'pointJitterPlugin',
  
  /**
   * Вызывается перед отрисовкой datasets
   * 
   * В этом методе вычисляются смещения и скрываются стандартные точки Chart.js
   * для точек, которые требуют смещения.
   * 
   * @param {Object} chart - Экземпляр Chart.js
   */
  beforeDatasetsDraw: (chart) => {
    // Проверка типа графика (плагин работает только для линейных графиков)
    if (!chart || !chart.config || chart.config.type !== 'line') {
      return;
    }
    
    // Сохраняем информацию о смещениях для использования в afterDatasetsDraw
    if (!chart._jitterData) {
      chart._jitterData = {};
    }
    
    try {
      const datasets = chart.data?.datasets;
      const labels = chart.data?.labels || [];
      
      if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
        return;
      }
      
      if (!Array.isArray(labels) || labels.length === 0) {
        return;
      }
      
      // Очистить предыдущие данные
      chart._jitterData = {};
      
      // Вычислить смещения для каждой позиции
      labels.forEach((label, positionIndex) => {
        const jitterResults = calculatePointJitter(chart, positionIndex, JITTER_THRESHOLD);
        
        if (jitterResults && jitterResults.length > 0) {
          // Сохранить смещения для использования в afterDatasetsDraw
          jitterResults.forEach(result => {
            const key = `${result.datasetIndex}_${positionIndex}`;
            chart._jitterData[key] = result.jitterX;
          });
        }
      });
      
    } catch (error) {
      // Логирование ошибки без прерывания работы графика
      console.warn('pointJitterPlugin: ошибка в beforeDatasetsDraw:', error);
    }
  },
  
  /**
   * Вызывается после отрисовки всех datasets
   * 
   * В этом методе происходит кастомная отрисовка точек со смещением.
   * Мы отрисовываем точки вручную, применяя вычисленные смещения,
   * но сохраняя оригинальные координаты для tooltip и кликов.
   * 
   * @param {Object} chart - Экземпляр Chart.js
   */
  afterDatasetsDraw: (chart) => {
    // Проверка типа графика
    if (!chart || !chart.config || chart.config.type !== 'line') {
      return;
    }
    
    // Проверка наличия canvas контекста
    if (!chart.ctx) {
      return;
    }
    
    // Проверка наличия данных о смещениях
    if (!chart._jitterData || Object.keys(chart._jitterData).length === 0) {
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
          
          // Получить смещение для этой точки
          const key = `${datasetIndex}_${dataIndex}`;
          const jitterX = chart._jitterData[key];
          
          // Если смещение не задано или равно 0, пропустить (точка уже отрисована Chart.js)
          if (jitterX === undefined || jitterX === 0) {
            return;
          }
          
          // Отрисовка смещённой точки
          ctx.save();
          
          try {
            // Получить стиль точки из dataset
            const pointStyle = dataset.pointStyle || 'circle';
            const pointRadius = dataset.pointRadius || 6;
            const pointBackgroundColor = Array.isArray(dataset.pointBackgroundColor)
              ? dataset.pointBackgroundColor[dataIndex] || dataset.pointBackgroundColor[0]
              : dataset.pointBackgroundColor;
            const pointBorderColor = Array.isArray(dataset.pointBorderColor)
              ? dataset.pointBorderColor[dataIndex] || dataset.pointBorderColor[0]
              : dataset.pointBorderColor;
            const pointBorderWidth = dataset.pointBorderWidth || 1;
            
            // Применить смещение
            const x = point.x + jitterX;
            const y = point.y;
            
            // Отрисовка точки с правильным стилем
            ctx.fillStyle = pointBackgroundColor || '#007bff';
            ctx.strokeStyle = pointBorderColor || '#ffffff';
            ctx.lineWidth = pointBorderWidth;
            
            ctx.beginPath();
            
            // Отрисовка в зависимости от стиля точки
            switch (pointStyle) {
              case 'circle':
                ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
                break;
              case 'triangle':
                // Треугольник (указывает вверх)
                ctx.moveTo(x, y - pointRadius);
                ctx.lineTo(x - pointRadius, y + pointRadius);
                ctx.lineTo(x + pointRadius, y + pointRadius);
                ctx.closePath();
                break;
              case 'rect':
              case 'rectRounded':
                // Квадрат
                const size = pointRadius * 1.4;
                ctx.rect(x - size / 2, y - size / 2, size, size);
                break;
              case 'rectRot':
                // Повёрнутый квадрат (ромб)
                const sizeRot = pointRadius * 1.4;
                ctx.moveTo(x, y - sizeRot / 2);
                ctx.lineTo(x + sizeRot / 2, y);
                ctx.lineTo(x, y + sizeRot / 2);
                ctx.lineTo(x - sizeRot / 2, y);
                ctx.closePath();
                break;
              case 'star':
                // Звезда (5 лучей)
                const starRadius = pointRadius;
                for (let i = 0; i < 5; i++) {
                  const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                  const px = x + starRadius * Math.cos(angle);
                  const py = y + starRadius * Math.sin(angle);
                  if (i === 0) {
                    ctx.moveTo(px, py);
                  } else {
                    ctx.lineTo(px, py);
                  }
                }
                ctx.closePath();
                break;
              case 'cross':
                // Крест
                const crossSize = pointRadius;
                ctx.moveTo(x - crossSize, y - crossSize);
                ctx.lineTo(x + crossSize, y + crossSize);
                ctx.moveTo(x + crossSize, y - crossSize);
                ctx.lineTo(x - crossSize, y + crossSize);
                break;
              case 'crossRot':
                // Повёрнутый крест (X)
                const crossRotSize = pointRadius;
                ctx.moveTo(x - crossRotSize, y);
                ctx.lineTo(x + crossRotSize, y);
                ctx.moveTo(x, y - crossRotSize);
                ctx.lineTo(x, y + crossRotSize);
                break;
              default:
                // По умолчанию - круг
                ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
            }
            
            // Заливка и обводка
            if (pointStyle !== 'cross' && pointStyle !== 'crossRot') {
              ctx.fill();
            }
            ctx.stroke();
            
            // Сохранить смещённые координаты для tooltip и кликов
            // (но оригинальные координаты остаются в point.x и point.y)
            if (!point._originalX) {
              point._originalX = point.x;
              point._originalY = point.y;
            }
            point._jitterX = jitterX;
            point._jitteredX = x;
            point._jitteredY = y;
            
          } catch (error) {
            console.warn(`pointJitterPlugin: ошибка при отрисовке точки ${datasetIndex}_${dataIndex}:`, error);
          } finally {
            ctx.restore();
          }
        });
      });
      
    } catch (error) {
      // Логирование ошибки без прерывания работы графика
      console.warn('pointJitterPlugin: ошибка в afterDatasetsDraw:', error);
    }
  },
  
  /**
   * Вызывается после отрисовки всего графика
   * Очистка временных данных
   */
  afterDraw: (chart) => {
    // Очистить временные данные после отрисовки
    if (chart._jitterData) {
      // Не очищаем полностью, так как данные могут понадобиться для tooltip
      // chart._jitterData = {};
    }
  }
};
