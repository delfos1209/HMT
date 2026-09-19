const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;


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