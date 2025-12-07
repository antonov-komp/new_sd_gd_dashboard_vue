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
export const chartColors = {
  primary: '#007bff',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40'
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

