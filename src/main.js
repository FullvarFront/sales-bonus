function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const revenue = sale_price * quantity * (1 - discount / 100);
  return revenue;
}

function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  let bonusPercent;

  if (index === 0) {
    bonusPercent = 0.15;
  } else if (index === 1 || index === 2) {
    bonusPercent = 0.1;
  } else if (index === total - 1) {
    bonusPercent = 0;
  } else {
    bonusPercent = 0.05;
  }

  return profit * bonusPercent;
}

function analyzeSalesData(data, options) {
  // Проверка options
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

  // ⚠️ ПРОВЕРКА ДАННЫХ С ВЫБРОСОМ ТОЧНЫХ ОШИБОК
  if (!data || typeof data !== "object") {
    throw new Error("Некорректные входные данные");
  }

  // 1. Проверяем sellers
  if (!Array.isArray(data.sellers)) {
    throw new Error("Некорректные входные данные");
  }
  if (data.sellers.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // ⚠️ 2. Проверяем products (должен быть массив и не пустой!)
  if (!Array.isArray(data.products)) {
    throw new Error("Некорректные входные данные");
  }
  if (data.products.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // ⚠️ 3. Проверяем purchase_records (должен быть массив и не пустой!)
  if (!Array.isArray(data.purchase_records)) {
    throw new Error("Некорректные входные данные");
  }
  if (data.purchase_records.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // Подготовка статистики
  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    name: seller.name || `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    top_products: [],
    bonus: 0,
  }));

  // Индексы для быстрого поиска
  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.seller_id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // Основной цикл
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Расчёт бонусов
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // Формирование top_products
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    delete seller.products_sold;
  });

  // Возврат результата
  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}

// Экспорт для тестов
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateSimpleRevenue,
    calculateBonusByProfit,
    analyzeSalesData,
  };
}
