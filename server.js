const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Alias según país detectado
const aliases = {
  CL: "Leti",
  TC: "Mafe",
  CO: "Carolina"
};

// Detectar ubicación aproximada por IP
async function getVisitorLocation(req) {
  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.socket.remoteAddress;

    if (!ip) {
      return {
        countryCode: null,
        countryName: "Ubicación desconocida",
        city: null
      };
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`);

    if (!response.ok) {
      throw new Error(`ipapi respondió ${response.status}`);
    }

    const data = await response.json();

    return {
      countryCode: data.country_code || null,
      countryName: data.country_name || "País desconocido",
      city: data.city || null
    };
  } catch (error) {
    console.error("No se pudo detectar ubicación:", error);

    return {
      countryCode: null,
      countryName: "Ubicación desconocida",
      city: null
    };
  }
}
// ==========================================
// CONFIGURACIÓN
// ==========================================

app.use(express.json({ type: "application/json" }));


// ==========================================
// RECIBIR LA CITA
// ==========================================

app.post("/api/cita", async (req, res) => {

    try {

        const {
            respuesta,
            actividad,
            fecha,
            hora,
            mensaje
        } = req.body;


        // ------------------------------------------
        // VALIDAR DATOS
        // ------------------------------------------

        if (
            !actividad?.nombre ||
            !actividad?.descripcion ||
            !fecha
        ) {

            return res.status(400).json({
                error: "Faltan datos de la cita."
            });

        }


        // ------------------------------------------
        // DETECTAR VISITANTE
        // ------------------------------------------

        const visitor = await getVisitorLocation(req);

        const alias =
            (visitor.countryCode && aliases[visitor.countryCode]) ||
            `🌎 Visitante de ${visitor.countryName}`;

        // ------------------------------------------
        // COMPROBAR CONFIGURACIÓN
        // ------------------------------------------

        if (!TELEGRAM_TOKEN || !CHAT_ID) {

            console.error(
                "Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID en .env"
            );

            return res.status(500).json({
                error: "El servidor no está configurado correctamente."
            });

        }


        // ------------------------------------------
        // FORMATEAR FECHA
        // ------------------------------------------

        const prettyDate =
            new Date(`${fecha}T12:00:00`)
                .toLocaleDateString(
                    "es-CO",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );


        // ------------------------------------------
        // CREAR MENSAJE PARA TELEGRAM
        // ------------------------------------------

       const text = [

    "💌 NUEVA CITA HMT",

    "",

    `👀 Posible visitante: ${alias}`,

    `🌎 Ubicación aproximada: ${visitor.countryName}${visitor.city ? `, ${visitor.city}` : ""}`,

    "",

    `💗 Respuesta: ${respuesta || "Sí 💗"}`,

    "",

    `🎯 Plan: ${actividad.nombre}`,

    `📝 ${actividad.descripcion}`,

    "",

    `📅 Fecha: ${prettyDate}`,

    `🕐 Hora: ${hora || "No especificada"}`,

    "",

    `💭 Mensaje: ${mensaje || "Nada más por ahora"}`

].join("\n");


        // ------------------------------------------
        // ENVIAR A TELEGRAM
        // ------------------------------------------

        const telegramResponse = await fetch(

            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,

            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: text
                })
            }

        );


        const telegramData =
            await telegramResponse.json();


        // ------------------------------------------
        // COMPROBAR RESPUESTA DE TELEGRAM
        // ------------------------------------------

        if (
            !telegramResponse.ok ||
            !telegramData.ok
        ) {

            console.error(
                "Telegram error:",
                telegramData
            );

            return res.status(502).json({
                error:
                    "Telegram no pudo enviar el mensaje."
            });

        }


        // ------------------------------------------
        // ÉXITO
        // ------------------------------------------

        console.log(
            "💌 Cita enviada correctamente a Telegram."
        );

        res.json({
            ok: true
        });


    } catch (error) {

        console.error(
            "Error en /api/cita:",
            error
        );

        res.status(500).json({
            error:
                "Error interno del servidor."
        });

    }

});


// ==========================================
// SERVIR EL HTML
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("💗 HMT funcionando correctamente");
        console.log(
            `🌐 http://localhost:${PORT}`
        );
        console.log("");

    }
);