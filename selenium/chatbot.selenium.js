const { Builder, By, until } = require('selenium-webdriver');
// require('chromedriver');

async function pruebaChatbot() {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('http://localhost:4200/dni-login');

    const inputDni = await driver.wait(
      until.elementLocated(By.css('input[type="text"]')),
      10000
    );

    await inputDni.sendKeys('19331864');

    const botonContinuar = await driver.findElement(By.css('button'));
    await botonContinuar.click();

    await driver.wait(
      until.urlContains('/seleccionar-chat'),
      10000
    );

    const botonTexto = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(),'Chat de Texto')]")),
      10000
    );

    await botonTexto.click();

    await driver.wait(
      until.urlContains('/chat'),
      10000
    );

    const textarea = await driver.wait(
      until.elementLocated(By.css('textarea')),
      10000
    );

    await textarea.sendKeys('Hola, quiero saber los horarios');

    const botonEnviar = await driver.findElement(By.css('.send-btn'));
    await botonEnviar.click();

    await driver.wait(
      until.elementLocated(By.css('.msg-row.bot')),
      15000
    );

    console.log('Prueba Selenium aprobada: el flujo DNI -> selección -> chat -> respuesta funciona correctamente.');

  } catch (error) {
    console.error('Prueba Selenium fallida:', error);
  } finally {
    await driver.quit();
  }
}

pruebaChatbot();