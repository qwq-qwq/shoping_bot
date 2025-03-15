# Примеры AI-анализа скриншотов

В этом документе приведены примеры запросов к OpenAI API для анализа скриншотов страниц продуктов и ожидаемые ответы.

## Пример запроса

```javascript
const formData = new FormData();
formData.append('model', 'gpt-4-vision-preview');
formData.append('messages', JSON.stringify([
  {
    role: 'user',
    content: [
      { 
        type: 'text', 
        text: `Analyze this screenshot of a product page from an online store.
1. Is the product available for purchase?
2. What sizes are available? The target sizes I'm looking for are: XS, S, M, L, XL
3. What is the price of the product?
4. Are there any "out of stock" or "not available" messages?

Please respond in JSON format with the following structure:
{
  "available": true/false,
  "availableSizes": ["size1", "size2", ...],
  "price": number,
  "outOfStockMessage": "text of any out of stock message or null if none"
}` 
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBuffer.toString('base64')}`
        }
      }
    ]
  }
]));
formData.append('max_tokens', 1000);

const response = await axios.post(
  'https://api.openai.com/v1/chat/completions',
  formData,
  {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
  }
);
```

## Пример ответа (продукт доступен)

```json
{
  "available": true,
  "availableSizes": ["S", "M", "L"],
  "price": 1499,
  "outOfStockMessage": null
}
```

## Пример ответа (продукт недоступен)

```json
{
  "available": false,
  "availableSizes": [],
  "price": 1499,
  "outOfStockMessage": "НЕМАЄ В НАЯВНОСТІ"
}
```

## Пример ответа (некоторые размеры недоступны)

```json
{
  "available": true,
  "availableSizes": ["M", "L"],
  "price": 1499,
  "outOfStockMessage": "XS and S sizes are currently out of stock"
}
```

## Обработка ответа

После получения ответа от API, бот обрабатывает его следующим образом:

1. Извлекает JSON из ответа (в случае, если API вернул дополнительный текст)
2. Фильтрует доступные размеры, оставляя только те, которые указаны в конфигурации продукта
3. Проверяет, что цена не превышает максимальную указанную цену
4. Проверяет, что есть хотя бы один доступный размер из целевых размеров

```javascript
// Пример обработки ответа
if (analysisResult.availableSizes) {
  analysisResult.availableSizes = analysisResult.availableSizes.filter(size => 
    item.sizes.some(targetSize => 
      size.includes(targetSize) || size === targetSize
    )
  );
}

// Проверка цены
if (analysisResult.price && analysisResult.price > item.maxPrice) {
  analysisResult.available = false;
  analysisResult.error = 'Price above maximum';
}

// Проверка наличия доступных размеров
if (analysisResult.availableSizes && analysisResult.availableSizes.length === 0) {
  analysisResult.available = false;
  analysisResult.error = 'No available sizes match target sizes';
}
```

## Советы по улучшению точности анализа

1. **Качество скриншотов**: Убедитесь, что скриншоты имеют хорошее качество и содержат всю необходимую информацию о продукте.
2. **Конкретные инструкции**: Чем конкретнее инструкции в запросе, тем точнее будет ответ.
3. **Целевые размеры**: Указывайте конкретные целевые размеры, чтобы модель знала, на что обращать внимание.
4. **Формат ответа**: Всегда запрашивайте ответ в формате JSON для облегчения обработки.
5. **Обработка ошибок**: Всегда обрабатывайте возможные ошибки в ответе API.

## Ограничения

1. **Стоимость API**: Использование GPT-4 Vision может быть дорогим при частых запросах.
2. **Время ответа**: API может отвечать с задержкой, особенно при анализе изображений.
3. **Точность**: Хотя модель очень точна, она может иногда ошибаться, особенно с нестандартными форматами размеров или цен.

## Резервный механизм

В случае проблем с API или отсутствия API ключа, бот автоматически переключается на традиционный анализ HTML-структуры страницы. 