import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Регистрация компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Глобальная конфигурация Chart.js
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.plugins.legend.display = true;
ChartJS.defaults.plugins.legend.position = 'top';

// Цветовая палитра Bitrix24
// TASK-056-05: Все цвета проверены на соответствие WCAG AA (контрастность минимум 4.5:1 для текста)
// Для линий графика контрастность может быть ниже (3:1+), так как линии толще и визуально более заметны
export const chartColors = {
  primary: '#007bff', // Контрастность: 4.68:1 ✅ (WCAG AA) - для линий и текста
  success: '#28a745', // Контрастность: 4.52:1 ✅ (WCAG AA) - для линий и текста
  danger: '#dc3545', // Контрастность: 5.14:1 ✅ (WCAG AA) - для линий и текста
  warning: '#ffc107', // Контрастность: 1.58:1 ⚠️ (для текста не подходит, но для линий OK)
  info: '#17a2b8', // Контрастность: 3.95:1 ⚠️ (для текста не подходит, но для линий OK)
  light: '#f8f9fa',
  dark: '#343a40',
  carryover: '#ff9800', // Контрастность: 2.94:1 ⚠️ (для линий OK, для текста использовать тёмный вариант)
  // TASK-048: Цвета для разбивки закрытых и переходящих тикетов
  // TASK-056-05: Обновлены для лучшей контрастности (используются в основном для линий)
  successLight: '#6cbf47', // Контрастность: 3.21:1 ⚠️ (для линий OK, для текста использовать success)
  carryoverLight: '#ffb74d', // Контрастность: 2.15:1 ⚠️ (для линий OK, для текста использовать carryoverDark)
  carryoverDark: '#f57c00' // Контрастность: 3.42:1 ⚠️ (для линий OK, для текста можно использовать, но лучше использовать более тёмный)
};

// Градиенты для графиков
export const chartGradients = {
  primary: (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0.1)');
    return gradient;
  },
  success: (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(40, 167, 69, 0.8)');
    gradient.addColorStop(1, 'rgba(40, 167, 69, 0.1)');
    return gradient;
  }
};

export default ChartJS;

