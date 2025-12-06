/**
 * Фильтр для фильтрации тикетов по сектору 1С
 * 
 * Фильтрует тикеты по глобальному тегу сектора 1С
 * Пользовательское поле UF_CRM_7_TYPE_PRODUCT должно содержать значение '1C'
 */

/**
 * Глобальный тег определения сектора 1С
 * Пользовательское поле UF_CRM_7_TYPE_PRODUCT
 */
const SECTOR_TAG = '1C';

/**
 * Фильтрация тикетов по тегу сектора 1С
 * 
 * Проверяет поле UF_CRM_7_TYPE_PRODUCT (может быть в разных регистрах)
 * 
 * @param {Array} tickets - Массив тикетов из Bitrix24
 * @returns {Array} Отфильтрованный массив тикетов сектора 1С
 */
export function filterBySector(tickets) {
  if (!Array.isArray(tickets)) {
    return [];
  }

  return tickets.filter(ticket => {
    // Пробуем разные варианты имени поля (с useOriginalUfNames и без)
    const tagValue = ticket.UF_CRM_7_TYPE_PRODUCT ||  // С useOriginalUfNames: 'Y'
                    ticket.uf_crm_7_type_product ||   // Без параметра (нижний регистр)
                    ticket.ufCrm7TypeProduct ||       // camelCase вариант
                    ticket['UF_CRM_7_TYPE_PRODUCT'] ||
                    ticket['uf_crm_7_type_product'];
    
    // Проверяем точное совпадение или если значение является массивом/объектом
    if (Array.isArray(tagValue)) {
      return tagValue.includes(SECTOR_TAG);
    }
    if (typeof tagValue === 'object' && tagValue !== null) {
      return tagValue.value === SECTOR_TAG || tagValue === SECTOR_TAG;
    }
    
    return tagValue === SECTOR_TAG;
  });
}

/**
 * Получение тега сектора
 * 
 * @returns {string} Тег сектора 1С
 */
export function getSectorTag() {
  return SECTOR_TAG;
}

