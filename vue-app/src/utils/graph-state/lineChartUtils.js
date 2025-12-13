/**
 * Утилиты для анализа линейных графиков Chart.js
 * 
 * @module lineChartUtils
 */

/**
 * Подсчитывает количество перекрывающихся точек на позиции
 * 
 * Точки считаются перекрывающимися, если их значения Y отличаются менее чем на threshold.
 * Функция группирует точки по близости значений и возвращает размер самой большой группы.
 * 
 * @param {number} position - Индекс позиции (временной точки) на оси X
 * @param {Array<Object>} datasets - Массив datasets графика Chart.js
 * @param {number} [threshold=0.5] - Порог для определения перекрытия (в единицах Y)
 * @returns {number} Количество перекрывающихся точек (0 если нет перекрытий или меньше 2 точек)
 * 
 * @example
 * const datasets = [
 *   { data: [10, 20, 30] },
 *   { data: [10, 25, 35] },
 *   { data: [15, 30, 40] }
 * ];
 * const count = getOverlapCount(0, datasets, 0.5); // Возвращает 2 (10 и 10 перекрываются)
 */
export function getOverlapCount(position, datasets, threshold = 0.5) {
  // Валидация входных данных
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
    return 0;
  }
  
  if (typeof position !== 'number' || position < 0) {
    return 0;
  }
  
  if (typeof threshold !== 'number' || threshold <= 0) {
    console.warn('getOverlapCount: threshold должен быть положительным числом, используется 0.5');
    threshold = 0.5;
  }
  
  // Сбор всех точек на позиции из всех datasets
  const points = [];
  datasets.forEach((dataset, datasetIndex) => {
    // Проверка наличия данных в dataset
    if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
      return; // Пропустить dataset без данных
    }
    
    const value = dataset.data[position];
    
    // Пропустить null, undefined, NaN
    if (value !== undefined && value !== null && !isNaN(value)) {
      points.push({
        datasetIndex,
        value: Number(value), // Привести к числу на случай строк
        y: Number(value) // Y-координата (значение)
      });
    }
  });
  
  // Нет перекрытий, если меньше 2 точек
  if (points.length < 2) {
    return 0;
  }
  
  // Группировка точек по близости Y-координат
  const groups = [];
  
  points.forEach(point => {
    let foundGroup = false;
    
    // Поиск существующей группы, в которую попадает точка
    for (const group of groups) {
      // Использовать среднее значение Y группы для сравнения
      const groupY = group.y;
      const diff = Math.abs(point.y - groupY);
      
      // Если разница меньше threshold, точка попадает в группу
      if (diff < threshold) {
        group.points.push(point);
        // Обновить среднее значение Y группы
        group.y = group.points.reduce((sum, p) => sum + p.y, 0) / group.points.length;
        foundGroup = true;
        break;
      }
    }
    
    // Если группа не найдена, создать новую
    if (!foundGroup) {
      groups.push({
        points: [point],
        y: point.y // Начальное значение Y группы
      });
    }
  });
  
  // Найти группу с максимальным количеством точек
  if (groups.length === 0) {
    return 0;
  }
  
  const maxGroup = groups.reduce((max, group) => 
    group.points.length > max.points.length ? group : max, 
    groups[0]
  );
  
  return maxGroup.points.length;
}

/**
 * Группирует точки с близкими значениями Y
 * 
 * @param {Array} points - Массив точек
 * @param {number} threshold - Порог для группировки
 * @returns {Array} Массив групп точек
 */
function groupOverlappingPoints(points, threshold) {
  const groups = [];
  
  points.forEach(point => {
    let foundGroup = false;
    
    for (const group of groups) {
      const groupY = group.y;
      if (Math.abs(point.value - groupY) < threshold) {
        group.points.push(point);
        // Обновить среднее значение Y группы
        group.y = group.points.reduce((sum, p) => sum + p.value, 0) / group.points.length;
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push({
        points: [point],
        y: point.value
      });
    }
  });
  
  return groups;
}

/**
 * Находит перекрывающиеся точки на линейном графике Chart.js
 * 
 * Анализирует все временные позиции графика и находит позиции, где несколько точек
 * разных datasets имеют одинаковые или близкие значения Y (в пределах threshold).
 * 
 * @param {Object} chart - Экземпляр Chart.js (должен быть типа 'line')
 * @param {number} [threshold=0.5] - Порог для определения перекрытия в единицах Y.
 *   Точки считаются перекрывающимися, если их значения отличаются менее чем на threshold.
 * @returns {Array<Object>} Массив объектов с информацией о перекрытиях.
 *   Пустой массив, если перекрытий нет или график не линейный.
 * @returns {number} returns[].position - Индекс позиции (временной точки) на оси X
 * @returns {number} returns[].count - Количество перекрывающихся точек (минимум 2)
 * @returns {number} returns[].x - X-координата на canvas (для отрисовки бейджа)
 * @returns {number} returns[].y - Y-координата на canvas (для отрисовки бейджа)
 * @returns {number} returns[].value - Среднее значение Y перекрывающихся точек
 * @returns {Array<Object>} returns[].points - Массив перекрывающихся точек
 * @returns {number} returns[].points[].datasetIndex - Индекс dataset
 * @returns {number} returns[].points[].value - Значение точки
 * @returns {string} returns[].points[].label - Метка dataset
 * 
 * @example
 * // Базовое использование
 * const chart = chartInstance; // Экземпляр Chart.js линейного графика
 * const overlaps = findOverlappingPoints(chart, 0.5);
 * console.log(`Найдено ${overlaps.length} позиций с перекрытиями`);
 * 
 * @example
 * // Использование с кастомным threshold
 * const overlaps = findOverlappingPoints(chart, 1.0); // Более строгий порог
 * 
 * @example
 * // Обработка результатов
 * overlaps.forEach(overlap => {
 *   console.log(`Позиция ${overlap.position}: ${overlap.count} перекрывающихся точек`);
 *   console.log(`Координаты: (${overlap.x}, ${overlap.y})`);
 * });
 * 
 * @throws {Error} Не выбрасывает ошибки, но логирует предупреждения в консоль
 *   при невалидных входных данных.
 * 
 * @see {@link getOverlapCount} для подсчёта перекрытий на конкретной позиции
 */
export function findOverlappingPoints(chart, threshold = 0.5) {
  // Валидация входных данных
  if (!chart) {
    console.warn('findOverlappingPoints: chart не передан');
    return [];
  }
  
  if (!chart.config || chart.config.type !== 'line') {
    // Не линейный график - возвращаем пустой массив без предупреждения
    // (функция может вызываться для разных типов графиков)
    return [];
  }
  
  const datasets = chart.data?.datasets;
  const labels = chart.data?.labels || [];
  
  // Проверка наличия данных
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
    return [];
  }
  
  if (!Array.isArray(labels) || labels.length === 0) {
    return [];
  }
  
  // Валидация threshold
  if (typeof threshold !== 'number' || threshold <= 0) {
    console.warn('findOverlappingPoints: threshold должен быть положительным числом, используется 0.5');
    threshold = 0.5;
  }
  
  const overlaps = [];
  
  // Проход по каждой временной позиции (label)
  labels.forEach((label, positionIndex) => {
    try {
      // Подсчёт перекрытий на позиции
      const overlapCount = getOverlapCount(positionIndex, datasets, threshold);
      
      // Пропустить позиции без перекрытий (меньше 2 точек)
      if (overlapCount < 2) {
        return;
      }
      
      // Сбор информации о всех точках на позиции
      const allPoints = [];
      
      datasets.forEach((dataset, datasetIndex) => {
        if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
          return;
        }
        
        const value = dataset.data[positionIndex];
        
        // Пропустить невалидные значения
        if (value === undefined || value === null || isNaN(value)) {
          return;
        }
        
        allPoints.push({
          datasetIndex,
          value: Number(value),
          label: dataset.label || `Dataset ${datasetIndex}`
        });
      });
      
      if (allPoints.length < 2) {
        return;
      }
      
      // Группировка точек с близкими значениями
      const grouped = groupOverlappingPoints(allPoints, threshold);
      
      if (grouped.length === 0) {
        return;
      }
      
      // Найти группу с максимальным количеством точек
      const maxGroup = grouped.reduce((max, group) => 
        group.points.length > max.points.length ? group : max, 
        grouped[0]
      );
      
      // Пропустить группы с менее чем 2 точками
      if (maxGroup.points.length < 2) {
        return;
      }
      
      // Получение координат точки на canvas для отрисовки
      // Используем первый dataset, который имеет точку на этой позиции
      let pointMeta = null;
      let pointElement = null;
      
      for (let i = 0; i < datasets.length; i++) {
        try {
          const meta = chart.getDatasetMeta(i);
          if (meta && meta.data && meta.data[positionIndex]) {
            pointMeta = meta;
            pointElement = meta.data[positionIndex];
            break;
          }
        } catch (error) {
          // Пропустить dataset, если не удалось получить meta
          continue;
        }
      }
      
      // Если не удалось найти точку на canvas, пропустить позицию
      if (!pointElement || typeof pointElement.x !== 'number' || typeof pointElement.y !== 'number') {
        return;
      }
      
      // Добавить информацию о перекрытии
      overlaps.push({
        position: positionIndex,
        count: maxGroup.points.length,
        x: pointElement.x,
        y: pointElement.y,
        value: maxGroup.y, // Среднее значение Y группы
        points: maxGroup.points.map(p => ({
          datasetIndex: p.datasetIndex,
          value: p.value,
          label: p.label
        }))
      });
      
    } catch (error) {
      // Логировать ошибку, но продолжить обработку других позиций
      console.warn(`findOverlappingPoints: ошибка при обработке позиции ${positionIndex}:`, error);
    }
  });
  
  return overlaps;
}

/**
 * Группирует точки по значениям Y для вычисления смещения
 * 
 * @param {Array} points - Массив точек с информацией о datasetIndex, value, x, y
 * @param {number} threshold - Порог для определения одинаковых значений
 * @returns {Array} Массив групп точек
 */
function groupPointsByValue(points, threshold) {
  const groups = [];
  
  points.forEach(point => {
    let foundGroup = false;
    
    for (const group of groups) {
      const groupY = group.y;
      if (Math.abs(point.y - groupY) < threshold) {
        group.points.push(point);
        // Обновить среднее значение Y группы
        group.y = group.points.reduce((sum, p) => sum + p.y, 0) / group.points.length;
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push({
        points: [point],
        y: point.y
      });
    }
  });
  
  return groups;
}

/**
 * Вычисляет смещение (jitter) для точек с одинаковыми значениями Y
 * 
 * Функция анализирует все точки на указанной временной позиции графика,
 * группирует точки с одинаковыми или близкими значениями Y (в пределах threshold),
 * и вычисляет оптимальное смещение по оси X для каждой точки, чтобы они не перекрывались.
 * 
 * @param {Object} chart - Экземпляр Chart.js (должен быть типа 'line')
 * @param {number} positionIndex - Индекс временной позиции (0, 1, 2...)
 * @param {number} [threshold=0.5] - Порог для определения одинаковых значений (в единицах Y)
 * @returns {Array<Object>} Массив объектов с информацией о смещении для каждой точки
 * @returns {number} returns[].datasetIndex - Индекс dataset точки
 * @returns {number} returns[].jitterX - Смещение по оси X в пикселях (может быть отрицательным, 0 или положительным)
 * @returns {number} returns[].value - Значение точки (Y-координата)
 * 
 * @example
 * // Базовое использование
 * const chart = chartInstance; // Экземпляр Chart.js линейного графика
 * const jitter = calculatePointJitter(chart, 0, 0.5);
 * // Возвращает массив: [
 * //   { datasetIndex: 0, jitterX: -2, value: 10 },
 * //   { datasetIndex: 1, jitterX: 0, value: 10 },
 * //   { datasetIndex: 2, jitterX: 2, value: 10 }
 * // ]
 * 
 * @example
 * // Использование с кастомным threshold
 * const jitter = calculatePointJitter(chart, 1, 1.0); // Более строгий порог
 * 
 * @throws {Error} Не выбрасывает ошибки, но логирует предупреждения в консоль
 *   при невалидных входных данных.
 * 
 * @see {@link findOverlappingPoints} для поиска перекрывающихся точек
 */
export function calculatePointJitter(chart, positionIndex, threshold = 0.5) {
  // Валидация входных данных
  if (!chart) {
    console.warn('calculatePointJitter: chart не передан');
    return [];
  }
  
  if (!chart.config || chart.config.type !== 'line') {
    // Не линейный график - возвращаем пустой массив без предупреждения
    return [];
  }
  
  if (typeof positionIndex !== 'number' || positionIndex < 0) {
    console.warn('calculatePointJitter: positionIndex должен быть неотрицательным числом');
    return [];
  }
  
  if (typeof threshold !== 'number' || threshold <= 0) {
    console.warn('calculatePointJitter: threshold должен быть положительным числом, используется 0.5');
    threshold = 0.5;
  }
  
  const datasets = chart.data?.datasets;
  const labels = chart.data?.labels || [];
  
  // Проверка наличия данных
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
    return [];
  }
  
  if (!Array.isArray(labels) || positionIndex >= labels.length) {
    return [];
  }
  
  // Сбор всех точек на данной позиции
  const points = [];
  
  datasets.forEach((dataset, datasetIndex) => {
    // Проверка наличия данных в dataset
    if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
      return; // Пропустить dataset без данных
    }
    
    const value = dataset.data[positionIndex];
    
    // Пропустить null, undefined, NaN
    if (value === undefined || value === null || isNaN(value)) {
      return;
    }
    
    // Получить метаданные точки для получения координат на canvas
    try {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta && meta.data && meta.data[positionIndex]) {
        const pointElement = meta.data[positionIndex];
        if (pointElement && typeof pointElement.x === 'number' && typeof pointElement.y === 'number') {
          points.push({
            datasetIndex,
            value: Number(value),
            x: pointElement.x,
            y: pointElement.y
          });
        }
      }
    } catch (error) {
      // Пропустить dataset, если не удалось получить meta
      console.warn(`calculatePointJitter: ошибка при получении meta для dataset ${datasetIndex}:`, error);
    }
  });
  
  // Нет точек - возвращаем пустой массив
  if (points.length === 0) {
    return [];
  }
  
  // Группировать точки с одинаковыми значениями Y
  const groups = groupPointsByValue(points, threshold);
  
  // Вычислить смещение для каждой группы
  const jitterResults = [];
  
  groups.forEach(group => {
    // group имеет структуру { points: [...], y: ... }
    const groupPoints = group.points || [];
    
    if (groupPoints.length > 1) {
      // Применить смещение только если точек больше одной
      const jitterStep = 2.5; // Шаг смещения в пикселях
      
      groupPoints.forEach((point, index) => {
        // Равномерное распределение: для 3 точек: -2.5, 0, +2.5
        const offset = (index - (groupPoints.length - 1) / 2) * jitterStep;
        jitterResults.push({
          datasetIndex: point.datasetIndex,
          jitterX: offset,
          value: point.value
        });
      });
    } else if (groupPoints.length === 1) {
      // Для одиночных точек смещение не нужно
      jitterResults.push({
        datasetIndex: groupPoints[0].datasetIndex,
        jitterX: 0,
        value: groupPoints[0].value
      });
    }
  });
  
  // Также добавить точки, которые не попали ни в одну группу (не перекрываются)
  // Это точки, которые были в исходном массиве, но не в группах
  const processedDatasetIndices = new Set(jitterResults.map(r => r.datasetIndex));
  points.forEach(point => {
    if (!processedDatasetIndices.has(point.datasetIndex)) {
      jitterResults.push({
        datasetIndex: point.datasetIndex,
        jitterX: 0,
        value: point.value
      });
    }
  });
  
  return jitterResults;
}



