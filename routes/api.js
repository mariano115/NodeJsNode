const express = require("express");
const Ticket = require("../Facebook/Ticket");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        ok: true,
        msg: "Esto esta funcionando bien",
    });
});

router.post("/tickets", (req, res) => {
    let body = req.body;
    let ticket = new Ticket({
        name: body.name,
        lastName: body.lastName,
        idFacebook: body.idFacebook,
        idCredicoop: body.idCredicoop,
        reason: body.reason,
    });
    ticket.save((err, ticketDB) => {
        if (err)
            return res.json({
                ok: false,
                msg: "Hubo un error",
            });
        res.json({
            ok: true,
            msg: "Ticket creado correctamente",
            product: ticketDB,
        });
    });
});

router.post("/prueba", (req, res) => {
    let body = req.body;
    console.log(body);
    res.json({
        ok: true,
        msg: "Json recibido correctamente",
        product: body,
    });
});

router.post("/products", (req, res) => {
    let body = req.body;
    let product = new Product({
        name: body.name,
        description: body.description,
        price: body.price,
        img: body.img,
    });
    product.save((err, productDB) => {
        if (err)
            return res.json({
                ok: false,
                msg: "Hubo un error",
            });
        res.json({
            ok: true,
            msg: "Producto creado correctamente",
            product: productDB,
        });
    });
});

module.exports = router;
