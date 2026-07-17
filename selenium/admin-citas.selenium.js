const { Builder, By, until } = require('selenium-webdriver');
const { Select } = require('selenium-webdriver/lib/select');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:4200';

const ADMIN_USUARIO = process.env.ADMIN_USUARIO || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

async function guardarCaptura(driver, nombreArchivo) {
  const carpeta = path.join(__dirname, 'evidencias');

  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }

  const captura = await driver.takeScreenshot();
  const ruta = path.join(carpeta, nombreArchivo);

  fs.writeFileSync(ruta, captura, 'base64');

  console.log(`Captura guardada: ${ruta}`);
}

async function obtenerTextoPorJavaScript(driver, selector) {
  return driver.executeScript(
    `
    const elemento = document.querySelector(arguments[0]);
    return elemento
      ? (elemento.textContent || '').trim()
      : '';
    `,
    selector
  );
}

async function esperarEstado(driver, citaId, estadoEsperado) {
  await driver.wait(
    async () => {
      const estado = await obtenerTextoPorJavaScript(
        driver,
        `[data-cita-id="${citaId}"] [data-testid="cita-estado"]`
      );

      return estado.toLowerCase() === estadoEsperado.toLowerCase();
    },
    20000,
    `La cita ${citaId} no cambió al estado ${estadoEsperado}.`
  );

  console.log(
    `Estado verificado: cita ${citaId} → ${estadoEsperado}`
  );
}

async function pulsarAccion(driver, citaId, testIdBoton) {
  await driver.wait(
    async () => {
      return driver.executeScript(
        `
        const boton = document.querySelector(
          '[data-cita-id="' + arguments[0] + '"] ' +
          '[data-testid="' + arguments[1] + '"]'
        );

        return Boolean(boton && !boton.disabled);
        `,
        citaId,
        testIdBoton
      );
    },
    10000,
    `No se encontró el botón ${testIdBoton}.`
  );

  await driver.executeScript(
    `
    const boton = document.querySelector(
      '[data-cita-id="' + arguments[0] + '"] ' +
      '[data-testid="' + arguments[1] + '"]'
    );

    boton.click();
    `,
    citaId,
    testIdBoton
  );
}

function interpretarFecha(fechaTexto) {
  const partes = fechaTexto.trim().split('/');

  if (partes.length !== 3) {
    throw new Error(
      `No se pudo interpretar la fecha: ${fechaTexto}`
    );
  }

  return {
    dia: Number(partes[0]),
    mes: Number(partes[1]) - 1,
    anio: Number(partes[2])
  };
}

async function pruebaAdministracionCitas() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  let citaId = '';
  let cliente = '';
  let fechaTexto = '';

  try {
    await driver.manage().window().maximize();

    // PASO 1: abrir login y limpiar sesión
    await driver.get(`${FRONTEND_URL}/login`);

    await driver.executeScript(`
      localStorage.removeItem('admin_token');
      sessionStorage.clear();
    `);

    await driver.navigate().refresh();

    // PASO 2: ingresar credenciales
    const inputUsuario = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="admin-usuario"]')
      ),
      10000
    );

    const inputPassword = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="admin-password"]')
      ),
      10000
    );

    await inputUsuario.sendKeys(ADMIN_USUARIO);
    await inputPassword.sendKeys(ADMIN_PASSWORD);

    const botonLogin = await driver.findElement(
      By.css('[data-testid="admin-login"]')
    );

    await botonLogin.click();

    await driver.wait(
      until.urlContains('/admin'),
      15000
    );

    console.log('Paso 1 aprobado: login administrativo correcto.');

    // PASO 3: entrar a Gestión de citas
    const menuCitas = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="menu-citas"]')
      ),
      10000
    );

    await menuCitas.click();

    await driver.wait(
      until.elementLocated(By.css('.table-wrapper table')),
      15000
    );

    await driver.wait(
      async () => {
        const cargando = await driver.findElements(
          By.css('.loading-row')
        );

        return cargando.length === 0;
      },
      15000
    );

    console.log('Paso 2 aprobado: módulo de citas visible.');

    // PASO 4: mostrar hasta 50 registros
    const selectorCantidad = await driver.findElement(
      By.css('[data-testid="citas-items-pagina"]')
    );

    const selectCantidad = new Select(selectorCantidad);
    await selectCantidad.selectByValue('50');

    await driver.sleep(1000);

    // PASO 5: localizar cualquier cita disponible
    await driver.wait(
    async () => {
        const filas = await driver.findElements(
        By.css('tbody tr[data-cita-id]')
        );

        return filas.length > 0;
    },
    15000,
    'No existen citas registradas para ejecutar la prueba.'
    );

    // Se obtiene la primera cita visible.
    // No importa si inicialmente está pendiente, confirmada,
    // completada o cancelada.
    const datosCita = await driver.executeScript(`
    const fila = document.querySelector('tbody tr[data-cita-id]');

    if (!fila) {
        return null;
    }

    const celdas = fila.querySelectorAll('td');

    return {
        id: fila.getAttribute('data-cita-id'),
        estado: fila.getAttribute('data-cita-estado'),
        cliente: celdas[0]
        ? (celdas[0].textContent || '').trim()
        : '',
        fecha: celdas[4]
        ? (celdas[4].textContent || '').trim()
        : ''
    };
    `);

    if (!datosCita) {
    throw new Error(
        'No se pudo obtener la información de una cita.'
    );
    }

    citaId = datosCita.id;
    cliente = datosCita.cliente;
    fechaTexto = datosCita.fecha;

    console.log(`Cita seleccionada: ${citaId}`);
    console.log(`Cliente: ${cliente}`);
    console.log(`Estado inicial: ${datosCita.estado}`);
    console.log(`Fecha: ${fechaTexto}`);

    await guardarCaptura(
    driver,
    'admin-cita-seleccionada.png'
    );

    // PASO 6: confirmar cita
    await pulsarAccion(
      driver,
      citaId,
      'btn-confirmar'
    );

    await esperarEstado(
      driver,
      citaId,
      'confirmada'
    );

    await guardarCaptura(
      driver,
      'admin-cita-confirmada.png'
    );

    // PASO 7: completar cita
    await pulsarAccion(
      driver,
      citaId,
      'btn-completar'
    );

    await esperarEstado(
      driver,
      citaId,
      'completada'
    );

    await guardarCaptura(
      driver,
      'admin-cita-completada.png'
    );

    // PASO 8: cancelar cita
    await pulsarAccion(
      driver,
      citaId,
      'btn-cancelar'
    );

    await esperarEstado(
      driver,
      citaId,
      'cancelada'
    );

    await guardarCaptura(
      driver,
      'admin-cita-cancelada.png'
    );

    // PASO 9: abrir calendario
    const menuCalendario = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="menu-calendario"]')
      ),
      10000
    );

    await menuCalendario.click();

    await driver.wait(
      until.elementLocated(By.css('.calendar-section')),
      10000
    );

    console.log('Paso 3 aprobado: calendario administrativo visible.');

    // PASO 10: ir al mes y año de la cita
    const fecha = interpretarFecha(fechaTexto);

    const selectorMes = await driver.findElement(
      By.css('[data-testid="calendario-mes"]')
    );

    const selectorAnio = await driver.findElement(
      By.css('[data-testid="calendario-anio"]')
    );

    const selectMes = new Select(selectorMes);
    const selectAnio = new Select(selectorAnio);

    await selectMes.selectByValue(String(fecha.mes));
    await selectAnio.selectByValue(String(fecha.anio));

    const botonIr = await driver.findElement(
      By.css('[data-testid="calendario-ir"]')
    );

    await botonIr.click();

    // PASO 11: verificar que la cita esté en el calendario
    await driver.wait(
      until.elementLocated(
        By.css(`.appointment[data-cita-id="${citaId}"]`)
      ),
      15000,
      `La cita ${citaId} no apareció en el calendario.`
    );

    await guardarCaptura(
      driver,
      'admin-cita-calendario.png'
    );

    console.log('');
    console.log('==========================================');
    console.log('PRUEBA SELENIUM ADMIN APROBADA');
    console.log('Login administrativo');
    console.log('Visualización de citas');
    console.log('Cambio a confirmada');
    console.log('Cambio a completada');
    console.log('Cambio a cancelada');
    console.log('Visualización en calendario');
    console.log('==========================================');

    await driver.sleep(7000);

  } catch (error) {
    console.error('');
    console.error('==========================================');
    console.error('PRUEBA SELENIUM ADMIN FALLIDA');
    console.error(error.message);
    console.error('==========================================');

    try {
      await guardarCaptura(
        driver,
        'admin-citas-error.png'
      );
    } catch (errorCaptura) {
      console.error(
        'No se pudo guardar la captura:',
        errorCaptura.message
      );
    }

    process.exitCode = 1;

  } finally {
    await driver.quit();
  }
}

pruebaAdministracionCitas();