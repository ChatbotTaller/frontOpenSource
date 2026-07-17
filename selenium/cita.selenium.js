const { Builder, By, until, Key } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:4200';

const DNI = '72111167';
const TELEFONO = '987654321';
const VEHICULO = 'Toyota Yaris 2020';
const SERVICIO = 'Mantenimiento preventivo';
const FECHA_HORA = '2026-07-16 10:00';

async function contarMensajesBot(driver) {
  return driver.executeScript(`
    return document.querySelectorAll('.msg-row.bot .msg-bubble').length;
  `);
}

async function obtenerUltimoMensajeBot(driver) {
  return driver.executeScript(`
    const mensajes = document.querySelectorAll(
      '.msg-row.bot .msg-bubble'
    );

    if (!mensajes.length) {
      return '';
    }

    return (mensajes[mensajes.length - 1].textContent || '').trim();
  `);
}

async function esperarRespuestaBot(driver, cantidadAnterior) {
  await driver.wait(
    async () => {
      try {
        const resultado = await driver.executeScript(`
          const mensajes = document.querySelectorAll(
            '.msg-row.bot .msg-bubble'
          );

          if (mensajes.length <= arguments[0]) {
            return false;
          }

          const ultimo = mensajes[mensajes.length - 1];
          const texto = (ultimo.textContent || '').trim();

          return texto.length > 0;
        `, cantidadAnterior);

        return resultado === true;
      } catch (error) {
        return false;
      }
    },
    45000,
    'Mara no respondió dentro del tiempo esperado.'
  );

  return obtenerUltimoMensajeBot(driver);
}

async function escribirMensaje(driver, texto) {
  await driver.wait(
    async () => {
      return driver.executeScript(`
        const textarea = document.querySelector('textarea');
        return Boolean(textarea && !textarea.disabled);
      `);
    },
    10000
  );

  const textarea = await driver.findElement(By.css('textarea'));

  await textarea.click();
  await textarea.sendKeys(Key.CONTROL, 'a');
  await textarea.sendKeys(Key.BACK_SPACE);
  await textarea.sendKeys(texto);
}

async function pulsarEnviar(driver) {
  await driver.wait(
    async () => {
      return driver.executeScript(`
        const boton = document.querySelector('.send-btn');
        return Boolean(boton && !boton.disabled);
      `);
    },
    10000,
    'El botón de envío no se habilitó.'
  );

  await driver.executeScript(`
    const boton = document.querySelector('.send-btn');

    if (boton) {
      boton.click();
    }
  `);
}

async function enviarMensaje(driver, texto) {
  const cantidadAnterior = await contarMensajesBot(driver);

  await escribirMensaje(driver, texto);
  await pulsarEnviar(driver);

  console.log(`Cliente: ${texto}`);

  const respuesta = await esperarRespuestaBot(
    driver,
    cantidadAnterior
  );

  console.log(`Mara: ${respuesta}`);
  console.log('');

  return respuesta;
}

function contiene(texto, opciones) {
  const normalizado = String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return opciones.some((opcion) =>
    normalizado.includes(
      opcion
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    )
  );
}

async function guardarCaptura(driver, nombreArchivo) {
  const carpeta = path.join(__dirname, 'evidencias');

  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }

  const captura = await driver.takeScreenshot();
  const ruta = path.join(carpeta, nombreArchivo);

  fs.writeFileSync(ruta, captura, 'base64');

  console.log(`Captura guardada en: ${ruta}`);
}

async function ejecutarPruebaCita() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  try {
    await driver.manage().window().maximize();

    /*
     * PASO 1: abrir la aplicación y limpiar sesiones anteriores
     */
    await driver.get(`${FRONTEND_URL}/dni-login`);

    await driver.executeScript(`
      localStorage.clear();
      sessionStorage.clear();
    `);

    await driver.navigate().refresh();

    /*
     * PASO 2: ingresar DNI
     */
    const inputDni = await driver.wait(
      until.elementLocated(By.css('input[type="text"]')),
      10000
    );

    await inputDni.sendKeys(DNI);

    const botonContinuar = await driver.wait(
      until.elementLocated(
        By.xpath(
          "//button[contains(normalize-space(),'Continuar')]"
        )
      ),
      10000
    );

    await botonContinuar.click();

    await driver.wait(
      until.urlContains('/seleccionar-chat'),
      15000
    );

    console.log('Paso 1 aprobado: DNI validado.');
    console.log('');

    /*
     * PASO 3: seleccionar chat de texto
     */
    const botonChatTexto = await driver.wait(
      until.elementLocated(
        By.xpath(
          "//button[contains(normalize-space(),'Chat de Texto')]"
        )
      ),
      10000
    );

    await botonChatTexto.click();

    await driver.wait(
      until.urlContains('/chat'),
      10000
    );

    await driver.wait(
      until.elementLocated(By.css('textarea')),
      10000
    );

    console.log(
      'Paso 2 aprobado: ingreso al chat de texto.'
    );
    console.log('');

    /*
     * PASO 4: iniciar el agendamiento
     */
    let respuesta = await enviarMensaje(
      driver,
      'Hola, quiero agendar una cita'
    );

    if (
      !contiene(respuesta, [
        'telefono',
        'celular',
        'numero de telefono'
      ])
    ) {
      throw new Error(
        `Se esperaba la solicitud del teléfono. Mara respondió: ${respuesta}`
      );
    }

    /*
     * PASO 5: enviar teléfono
     */
    respuesta = await enviarMensaje(
      driver,
      TELEFONO
    );

    if (
      !contiene(respuesta, [
        'vehiculo',
        'auto',
        'carro',
        'marca',
        'modelo'
      ])
    ) {
      throw new Error(
        `Se esperaba la solicitud del vehículo. Mara respondió: ${respuesta}`
      );
    }

    /*
     * PASO 6: enviar vehículo
     */
    respuesta = await enviarMensaje(
      driver,
      VEHICULO
    );

    if (
      !contiene(respuesta, [
        'problema',
        'servicio',
        'motivo',
        'revision',
        'necesitas'
      ])
    ) {
      throw new Error(
        `Se esperaba la solicitud del servicio. Mara respondió: ${respuesta}`
      );
    }

    /*
     * PASO 7: enviar servicio
     */
    respuesta = await enviarMensaje(
      driver,
      SERVICIO
    );

    if (
      !contiene(respuesta, [
        'fecha',
        'hora',
        'fecha y hora',
        'ejemplo'
      ])
    ) {
      throw new Error(
        `Se esperaba la solicitud de fecha y hora. Mara respondió: ${respuesta}`
      );
    }

    /*
     * PASO 8: enviar fecha y hora
     */
    respuesta = await enviarMensaje(
      driver,
      FECHA_HORA
    );

    /*
     * Algunos flujos piden una confirmación adicional.
     */
    if (
      contiene(respuesta, [
        'confirmas',
        'confirmar',
        'deseas registrar',
        'datos correctos',
        'esta correcto',
        'confirmacion'
      ])
    ) {
      respuesta = await enviarMensaje(
        driver,
        'Sí, confirmo la cita'
      );
    }

    /*
     * PASO 9: validar confirmación final
     */
    const confirmada = contiene(respuesta, [
      'cita confirmada',
      'cita registrada',
      'cita agendada',
      'registrada correctamente',
      'agendada correctamente',
      'reserva confirmada',
      'se registro tu cita',
      'hemos registrado tu cita'
    ]);

    if (!confirmada) {
      throw new Error(
        `No se detectó la confirmación final. Última respuesta: ${respuesta}`
      );
    }

    await guardarCaptura(
      driver,
      'selenium-cita-confirmada.png'
    );

    console.log('========================================');
    console.log('PRUEBA SELENIUM APROBADA');
    console.log(
      'DNI -> teléfono -> vehículo -> servicio -> fecha y hora -> cita confirmada'
    );
    console.log('========================================');

    await driver.sleep(7000);

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('PRUEBA SELENIUM FALLIDA');
    console.error(error.message);
    console.error('========================================');

    try {
      await guardarCaptura(
        driver,
        'selenium-error-cita.png'
      );
    } catch (errorCaptura) {
      console.error(
        'No fue posible guardar la captura:',
        errorCaptura.message
      );
    }

    process.exitCode = 1;

  } finally {
    await driver.quit();
  }
}

ejecutarPruebaCita();