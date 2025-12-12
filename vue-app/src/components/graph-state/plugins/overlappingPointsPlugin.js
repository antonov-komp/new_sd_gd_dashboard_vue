/**
 * Плагин Chart.js для визуализации перекрывающихся точек через увеличение размера
 * 
 * Плагин анализирует линейный график, находит позиции с перекрывающимися точками
 * и увеличивает размер точек в зависимости от количества перекрытий.
 * 
 * @module overlappingPointsPlugin
 */

import { findOverlappingPoints } from '@/utils/graph-state/lineChartUtils.js';

/**
 * Порог для определения перекрытия точек (в единицах Y)
 * Точки считаются перекрывающимися, если их значения отличаются менее чем на 0.5
 */
const OVERLAP_THRESHOLD = 0.5;

/**
 * Базовый размер точки (соответствует pointRadius: 6)
 */
const BASE_POINT_RADIUS = 6;

/**
 * Множитель увеличения размера точки за каждое перекрытие
 * Формула: размер = BASE_POINT_RADIUS + (count - 1) * SIZE_MULTIPLIER
 */
const SIZE_MULTIPLIER = 2;


/**
 * Вычисляет размер точки на основе количества перекрытий
 * 
 * @param {number} count - Количество перекрывающихся точек (минимум 2)
 * @returns {number} Радиус точки в пикселях
 */
function calculatePointRadius(count) {
  if (typeof count !== 'number' || count < 2) {
    return BASE_POINT_RADIUS;
  }
  
  // Формула: базовый размер + (количество перекрытий - 1) * множитель
  // Для 2 перекрытий: 6 + (2-1)*2 = 8px
  // Для 3 перекрытий: 6 + (3-1)*2 = 10px
  // Для 4 перекрытий: 6 + (4-1)*2 = 12px
  return BASE_POINT_RADIUS + (count - 1) * SIZE_MULTIPLIER;
}

/**
 * Отрисовывает увеличенную точку для позиции с перекрытиями
 * 
 * Отрисовывает полупрозрачный круг большего размера поверх стандартной точки,
 * чтобы визуально показать наличие перекрытий.
 * 
 * @param {Object} chart - Экземпляр Chart.js с валидным ctx (контекст canvas)
 * @param {Object} overlap - Объект с информацией о перекрытии
 * @param {number} overlap.x - X-координата точки на canvas (обязательно)
 * @param {number} overlap.y - Y-координата точки на canvas (обязательно)
 * @param {number} overlap.count - Количество перекрывающихся точек (минимум 2)
 * @param {Array} overlap.points - Массив перекрывающихся точек с информацией о dataset
 * 
 * @returns {void} Функция ничего не возвращает
 * 
 * @example
 * const overlap = {
 *   x: 100,
 *   y: 50,
 *   count: 3,
 *   points: [{ datasetIndex: 0, value: 10 }, { datasetIndex: 1, value: 10 }]
 * };
 * drawEnlargedPoint(chart, overlap);
 * // Отрисовывает увеличенный круг (радиус 10px) поверх точки (100, 50)
 * 
 * @throws {Error} Не выбрасывает ошибки, но логирует предупреждения в консоль
 *   при невалидных входных данных. Всегда восстанавливает состояние canvas.
 */
function drawEnlargedPoint(chart, overlap) {
  // Валидация входных данных
  if (!chart || !chart.ctx) {
    console.warn('drawEnlargedPoint: chart или ctx недоступен');
    return;
  }
  
  if (!overlap || typeof overlap.x !== 'number' || typeof overlap.y !== 'number') {
    console.warn('drawEnlargedPoint: невалидные координаты overlap', overlap);
    return;
  }
  
  const count = overlap.count;
  if (typeof count !== 'number' || count < 2) {
    return; // Нет перекрытий, не нужно увеличивать точку
  }
  
  const ctx = chart.ctx;
  const { x, y, points } = overlap;
  
  // Вычислить размер точки на основе количества перекрытий
  const pointRadius = calculatePointRadius(count);
  
  // Проверка, что координаты в пределах canvas
  const canvas = ctx.canvas;
  if (!canvas) {
    return;
  }
  
  // Сохранение состояния canvas (важно для восстановления после отрисовки)
  ctx.save();
  
  try {
    // Отрисовка увеличенного круга поверх стандартной точки
    // Используем полупрозрачный цвет, чтобы не перекрывать стандартные точки полностью
    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    
    // Используем цвет первого перекрывающегося dataset или серый по умолчанию
    let pointColor = 'rgba(128, 128, 128, 0.3)'; // Полупрозрачный серый по умолчанию
    
    if (points && points.length > 0 && chart.data && chart.data.datasets) {
      const firstDatasetIndex = points[0].datasetIndex;
      const dataset = chart.data.datasets[firstDatasetIndex];
      
      if (dataset && dataset.pointBackgroundColor) {
        // Получить цвет точки (может быть массивом или строкой)
        const color = Array.isArray(dataset.pointBackgroundColor) 
          ? dataset.pointBackgroundColor[overlap.position] || dataset.pointBackgroundColor[0]
          : dataset.pointBackgroundColor;
        
        if (color) {
          // Преобразовать hex в rgba с прозрачностью
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            pointColor = `rgba(${r}, ${g}, ${b}, 0.4)`; // 40% прозрачности
          } else if (color.startsWith('rgba')) {
            // Если уже rgba, изменить альфа-канал
            pointColor = color.replace(/rgba?\(([^)]+)\)/, (match, values) => {
              const parts = values.split(',').map(v => v.trim());
              return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0.4)`;
            });
          } else {
            pointColor = color + '66'; // Добавить прозрачность для hex
          }
        }
      }
    }
    
    ctx.fillStyle = pointColor;
    ctx.fill();
    
    // Добавить обводку для лучшей видимости
    ctx.strokeStyle = pointColor.replace('0.4', '0.6').replace('66', '99');
    ctx.lineWidth = 1;
    ctx.stroke();
    
  } catch (error) {
    // Логировать ошибку, но не прерывать работу плагина
    console.warn('drawEnlargedPoint: ошибка при отрисовке увеличенной точки:', error);
  } finally {
    // Всегда восстанавливать состояние canvas
    ctx.restore();
  }
}

/**
 * Плагин Chart.js для визуализации перекрывающихся точек через увеличение размера
 */
export const overlappingPointsPlugin = {
  id: 'overlappingPointsPlugin',
  
  /**
   * Вызывается после отрисовки всех datasets графика
   * 
   * В этом методе происходит анализ перекрытий и отрисовка увеличенных точек.
   * Метод вызывается Chart.js автоматически при каждой перерисовке графика.
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
      // Найти все перекрывающиеся точки на графике
      const overlaps = findOverlappingPoints(chart, OVERLAP_THRESHOLD);
      
      if (!Array.isArray(overlaps) || overlaps.length === 0) {
        return; // Нет перекрытий
      }
      
      // Отфильтровать только перекрытия с валидными координатами
      // Теперь отображаем все перекрытия (начиная с 2 точек), а не только 3+
      const validOverlaps = overlaps.filter(overlap => {
        // Проверка наличия объекта overlap
        if (!overlap || typeof overlap !== 'object') {
          return false;
        }
        
        // Проверка количества перекрытий (минимум 2)
        if (typeof overlap.count !== 'number' || overlap.count < 2) {
          return false;
        }
        
        // Проверка валидности координат
        if (typeof overlap.x !== 'number' || typeof overlap.y !== 'number') {
          return false;
        }
        
        // Проверка, что координаты не NaN и не Infinity
        if (!isFinite(overlap.x) || !isFinite(overlap.y)) {
          return false;
        }
        
        return true;
      });
      
      // Отрисовка увеличенных точек для каждого перекрытия
      validOverlaps.forEach(overlap => {
        try {
          drawEnlargedPoint(chart, overlap);
        } catch (error) {
          // Логировать ошибку для конкретной точки, но продолжить отрисовку остальных
          console.warn(`overlappingPointsPlugin: ошибка при отрисовке увеличенной точки для позиции ${overlap.position}:`, error);
        }
      });
      
    } catch (error) {
      // Логирование ошибки без прерывания работы графика
      // Плагин не должен ломать основной график при ошибках
      console.warn('overlappingPointsPlugin: ошибка в afterDatasetsDraw:', error);
    }
  }
};
