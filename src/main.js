// --- Функции расчета ---

function calculateSimpleRevenue(purchaseItem) {
  const basePricePerUnit = purchaseItem.sale_price || 0;
  const quantity = purchaseItem.quantity || 0;
  const discountPercentage = purchaseItem.discount || 0;
  const discountFactor = 1 - discountPercentage / 100;
  return basePricePerUnit * quantity * discountFactor;
}

function calculateBonusByProfit(index, total, seller) {
  if (total === 0) return 0;
  const lastIndex = total - 1;
  if (index === 0) return 0.15;
  if (index === 1 || index === 2) return 0.1;
  if (index === lastIndex) return 0.0;
  return 0.05;
}

// --- Основная функция analyzeSalesData ---
function analyzeSalesData(data, options = {}) {
  // Шаг 1: Проверки входных данных и опций
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Используем _наши_ дефолтные функции, если опции не переданы
  const {
    calculateRevenue = calculateSimpleRevenue,
    calculateBonus = calculateBonusByProfit,
  } = options;

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("calculateRevenue и calculateBonus должны быть функциями");
  }

  // Создание индексов и инициализация статистики
  const sellerIndex = Object.create(null);
  data.sellers.forEach((seller) => {
    sellerIndex[seller.id] = {
      id: seller.id,
      first_name: seller.first_name,
      last_name: seller.last_name,
      position: seller.position,
      sales_count: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      products_sold: Object.create(null), // { sku: { quantity: N, total_revenue: R } }
    };
  });

  const productIndex = Object.create(null);
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // Агрегация данных
  data.purchase_records.forEach((record) => {
    // ИСПРАВЛЕНО: с record.sellerId на record.seller_id
    const sellerId = record.seller_id;
    const seller = sellerIndex[sellerId];
    if (!seller) return; // Пропустить, если продавца нет

    seller.sales_count += 1;

    let currentRecordProfit = 0;
    let currentRecordCost = 0;
    let currentRecordRevenue = 0;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return; // Пропустить, если товара нет

      const revenue = calculateRevenue(item); // Выручка по позиции (productInfo не нужен здесь)
      // ИСПРАВЛЕНО: с на ||
      const cost = (product.purchase_price || 0) * item.quantity; // Себестоимость позиции
      const profit = revenue - cost;

      currentRecordRevenue += revenue;
      currentRecordCost += cost;
      currentRecordProfit += profit;

      // Агрегация проданных товаров: теперь храним количество и выручку по SKU
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = { quantity: 0, total_revenue: 0 };
      }
      seller.products_sold[item.sku].quantity += item.quantity;
      seller.products_sold[item.sku].total_revenue += revenue; // Добавляем выручку для этого SKU
    });

    seller.revenue += currentRecordRevenue;
    seller.cost += currentRecordCost;
    seller.profit += currentRecordProfit;
  });

  // Преобразование sellerIndex в массив для сортировки и дальнейшей обработки
  let sellerStatsArray = Object.values(sellerIndex);

  // Сортировка продавцов по прибыли
  sellerStatsArray.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStatsArray.length;

  // Назначение бонусов и формирование топа продуктов
  const finalizedSellerStats = sellerStatsArray.map((seller, index) => {
    const bonusPercentage = calculateBonus(index, totalSellers, seller);
    seller.bonus = seller.profit * bonusPercentage;

    // Формирование топ-10 проданных продуктов
    const productEntries = Object.entries(seller.products_sold || {});
    const productArray = productEntries.map(([sku, aggregatedData]) => {
      const productInfo = productIndex[sku];
      return {
        sku: sku,
        quantity: aggregatedData.quantity, // Используем агрегированное количество
        name: productInfo ? productInfo.name : "Неизвестный товар",
        revenue: aggregatedData.total_revenue, // Используем агрегированную выручку
      };
    });
    // Сортировка по количеству проданных единиц для формирования топа
    productArray.sort((a, b) => b.quantity - a.quantity);
    seller.top_products = productArray.slice(0, 10);

    return seller; // Возвращаем модифицированный объект продавца
  });

  // --- Форматирование финального отчета ---
  function formatFinalReport(reportData) {
    return reportData.map((seller) => {
      // Форматирование числовых полей
      const formattedRevenue = seller.revenue.toFixed(2);
      const formattedProfit = seller.profit.toFixed(2);
      const formattedBonus = seller.bonus.toFixed(2);

      return {
        seller_id: seller.id,
        // ИСПРАВЛЕНО: Объединение имени и фамилии
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: formattedRevenue,
        profit: formattedProfit,
        sales_count: seller.sales_count,
        top_products: seller.top_products.map((product) => ({
          product_id: product.sku,
          name: product.name,
          count: product.quantity,
          revenue: product.revenue.toFixed(2), // Предполагается, что revenue рассчитано для топа
        })),
        bonus: formattedBonus,
      };
    });
  }

  const finalReport = formatFinalReport(finalizedSellerStats);
  return finalReport; // Возвращаем окончательный отчет
}

// --- Экспорт функций для использования в других модулях (например, в тестах) ---
module.exports = {
  analyzeSalesData,
  calculateSimpleRevenue,
  calculateBonusByProfit,
};

// --- Код для локального запуска (если вы запустите этот файл напрямую) ---
if (require.main === module) {
  console.log("Запуск analyzeSalesData с локальными данными...");
  try {
    const finalReport = analyzeSalesData(sampleDataForLocalRun);
    console.log("--- Финальный отчет ---");
    // Используем console.table для красивого вывода, как в скриншоте
    console.table(
      finalReport.map((s) => ({
        seller_id: s.seller_id,
        name: s.name,
        revenue: parseFloat(s.revenue), // Для console.table лучше числа
        profit: parseFloat(s.profit),
        sales_count: s.sales_count,
        top_products: s.top_products, // Будет отображено как Array(N)
        bonus: parseFloat(s.bonus),
      }))
    );

    console.log("\n--- Полная структура первого продавца (для отладки) ---");
    console.dir(finalReport[0], { depth: null }); // Показать всю структуру
  } catch (error) {
    console.error("Произошла ошибка при локальном запуске:", error);
  }
}
