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

async function obtenerTexto(driver, selector) {
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

async function obtenerDashboard(driver) {
  return {
    accuracy: await obtenerTexto(
      driver,
      '[data-testid="metrica-accuracy"] p'
    ),
    precision: await obtenerTexto(
      driver,
      '[data-testid="metrica-precision"] p'
    ),
    recall: await obtenerTexto(
      driver,
      '[data-testid="metrica-recall"] p'
    ),
    f1: await obtenerTexto(
      driver,
      '[data-testid="metrica-f1"] p'
    ),
    tiempo: await obtenerTexto(
      driver,
      '[data-testid="metrica-tiempo"] p'
    )
  };
}

function dashboardCambio(antes, despues) {
  return (
    antes.accuracy !== despues.accuracy ||
    antes.precision !== despues.precision ||
    antes.recall !== despues.recall ||
    antes.f1 !== despues.f1
  );
}

async function pruebaMetricasAdmin() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  try {
    await driver.manage().window().maximize();

    /*
     * PASO 1: login administrativo
     */
    await driver.get(`${FRONTEND_URL}/login`);

    await driver.executeScript(`
      localStorage.removeItem('admin_token');
      sessionStorage.clear();
    `);

    await driver.navigate().refresh();

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

    /*
     * PASO 2: abrir Métricas IA
     */
    const botonMetricas = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="btn-metricas-ia"]')
      ),
      10000
    );

    await botonMetricas.click();

    await driver.wait(
      until.urlContains('/metricas'),
      10000
    );

    await driver.wait(
      until.elementLocated(
        By.css('[data-testid="metrica-accuracy"]')
      ),
      15000
    );

    const metricasAntes = await obtenerDashboard(driver);

    console.log('Paso 2 aprobado: dashboard de métricas visible.');
    console.log('Métricas iniciales:', metricasAntes);

    await guardarCaptura(
      driver,
      'metricas-dashboard-antes.png'
    );

    /*
     * PASO 3: abrir Registro de interacciones
     */
    const botonRegistro = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="menu-registro-interacciones"]')
      ),
      10000
    );

    await botonRegistro.click();

    await driver.wait(
      until.elementLocated(By.css('.table-wrapper table')),
      15000
    );

    /*
     * Mostrar hasta 50 interacciones
     */
    const selectorCantidad = await driver.findElement(
      By.css('[data-testid="metricas-items-pagina"]')
    );

    const selectCantidad = new Select(selectorCantidad);
    await selectCantidad.selectByValue('50');

    await driver.sleep(1000);

    /*
     * PASO 4: seleccionar una interacción
     */
    await driver.wait(
      async () => {
        const filas = await driver.findElements(
          By.css('tbody tr[data-metrica-id]')
        );

        return filas.length > 0;
      },
      15000,
      'No existen interacciones registradas.'
    );

    const datosInteraccion = await driver.executeScript(`
      const filas = Array.from(
        document.querySelectorAll('tbody tr[data-metrica-id]')
      );

      /*
       * Se prioriza una interacción pendiente.
       * Si no hay pendientes, se toma la primera.
       */
      const fila =
        filas.find(
          item =>
            item.getAttribute('data-respuesta-correcta') === 'null'
        ) || filas[0];

      if (!fila) {
        return null;
      }

      const celdas = fila.querySelectorAll('td');

      return {
        id: fila.getAttribute('data-metrica-id'),
        respuestaCorrecta:
          fila.getAttribute('data-respuesta-correcta'),
        intentDetectado:
          fila.getAttribute('data-intent-detectado'),
        pregunta: celdas[0]
          ? (celdas[0].textContent || '').trim()
          : ''
      };
    `);

    if (!datosInteraccion) {
      throw new Error(
        'No se pudo seleccionar una interacción.'
      );
    }

    const metricaId = datosInteraccion.id;

    console.log(`Interacción seleccionada: ${metricaId}`);
    console.log(`Pregunta: ${datosInteraccion.pregunta}`);
    console.log(
      `Intent detectado: ${datosInteraccion.intentDetectado}`
    );
    console.log(
      `Estado inicial: ${datosInteraccion.respuestaCorrecta}`
    );

    /*
     * PASO 5: elegir intent correcto
     *
     * Se selecciona appointment si el detectado no es appointment.
     * En caso contrario, se selecciona info.
     * Así se garantiza una modificación visible.
     */
    const nuevoIntent =
      datosInteraccion.intentDetectado === 'appointment'
        ? 'info'
        : 'appointment';

    const selectorIntent = await driver.findElement(
      By.css(
        `tr[data-metrica-id="${metricaId}"] ` +
        '[data-testid="select-intent-correcto"]'
      )
    );

    const selectIntent = new Select(selectorIntent);
    await selectIntent.selectByValue(nuevoIntent);

    console.log(`Nuevo intent seleccionado: ${nuevoIntent}`);

    /*
     * PASO 6: evaluar la interacción
     *
     * Si estaba correcta, se marca incorrecta.
     * En cualquier otro caso, se marca correcta.
     */
    const marcarComoCorrecta =
      datosInteraccion.respuestaCorrecta !== '1';

    const testIdBoton = marcarComoCorrecta
      ? 'btn-evaluar-correcta'
      : 'btn-evaluar-incorrecta';

    await driver.executeScript(
      `
      const boton = document.querySelector(
        'tr[data-metrica-id="' + arguments[0] + '"] ' +
        '[data-testid="' + arguments[1] + '"]'
      );

      if (boton) {
        boton.click();
      }
      `,
      metricaId,
      testIdBoton
    );

    const estadoEsperado = marcarComoCorrecta
      ? 'Correcta'
      : 'Incorrecta';

    /*
     * PASO 7: comprobar actualización de la fila
     */
    await driver.wait(
      async () => {
        const estado = await obtenerTexto(
          driver,
          `tr[data-metrica-id="${metricaId}"] ` +
          '[data-testid="estado-evaluacion"]'
        );

        return estado.toLowerCase() ===
          estadoEsperado.toLowerCase();
      },
      20000,
      `La interacción no cambió a ${estadoEsperado}.`
    );

    console.log(
      `Paso 3 aprobado: interacción evaluada como ${estadoEsperado}.`
    );

    await guardarCaptura(
      driver,
      'metricas-interaccion-evaluada.png'
    );

    /*
     * PASO 8: volver al dashboard
     */
    const botonDashboard = await driver.wait(
      until.elementLocated(
        By.css('[data-testid="menu-dashboard-metricas"]')
      ),
      10000
    );

    await botonDashboard.click();

    await driver.wait(
      until.elementLocated(
        By.css('[data-testid="metrica-accuracy"]')
      ),
      10000
    );

    /*
     * Esperar recarga de métricas
     */
    await driver.sleep(1500);

    const metricasDespues = await obtenerDashboard(driver);

    console.log('Métricas finales:', metricasDespues);

    /*
     * PASO 9: comprobar cambio
     */
    if (!dashboardCambio(metricasAntes, metricasDespues)) {
      throw new Error(
        'La evaluación se guardó, pero los valores visibles del dashboard no cambiaron.'
      );
    }

    await guardarCaptura(
      driver,
      'metricas-dashboard-despues.png'
    );

    console.log('');
    console.log('==========================================');
    console.log('PRUEBA SELENIUM DE MÉTRICAS APROBADA');
    console.log('Login administrativo');
    console.log('Visualización del dashboard');
    console.log('Ingreso al registro de interacciones');
    console.log('Selección de intent correcto');
    console.log(`Evaluación como ${estadoEsperado}`);
    console.log('Comprobación de cambios en el dashboard');
    console.log('==========================================');

    await driver.sleep(7000);

  } catch (error) {
    console.error('');
    console.error('==========================================');
    console.error('PRUEBA SELENIUM DE MÉTRICAS FALLIDA');
    console.error(error.message);
    console.error('==========================================');

    try {
      await guardarCaptura(
        driver,
        'metricas-error.png'
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

pruebaMetricasAdmin();