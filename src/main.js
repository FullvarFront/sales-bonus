/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;

  const revenue = sale_price * quantity * (1 - discount / 100);

  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return 15;
  }
  if (index === 1 || index === 2) {
    return 10;
  }
  if (index === total - 1) {
    return 0;
  } else {
    return 5;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных

  if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций
  if (typeof options !== "object" || options === null) {
    throw new Error("options должен быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || !calculateBonus) {
    throw new Error(
      "В options должны быть функции calculateRevenue и calculateBonus"
    );
  }

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("calculateRevenue и calculateBonus должны быть функциями");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики

  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    name: seller.first_name + " " + seller.last_name,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    top_products: [],
    bonus: 0,
  }));

  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.seller_id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // Основной цикл обработки продаж
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    if (!seller) return;

    // Статистика по чеку
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    // Обработка каждого товара в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      if (!product) return;

      // Расчёт себестоимости
      const cost = product.purchase_price * item.quantity;

      // Расчёт выручки с учётом скидки
      const revenue = calculateRevenue(item, product);

      // Расчёт прибыли
      const profit = revenue - cost;
      seller.profit += profit;

      // Учёт проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);
  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    // 1. Расчёт процента бонуса
    const bonusPercent = calculateBonus(index, sellerStats.length, seller);

    // 2. Расчёт бонуса в рублях
    seller.bonus = (seller.profit * bonusPercent) / 100;

    // 3. Формирование top_products
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
  // @TODO: Подготовка итоговой коллекции с нужными полями
}
console.log(data.sellers[0]);
