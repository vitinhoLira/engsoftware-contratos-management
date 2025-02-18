import express from "express";
import { create } from "express-handlebars";
import {get, push, ref, remove, update } from "firebase/database";
import methodOverride from "method-override";
import { db } from "./database/db.mjs";

const app = express();

app.use(methodOverride("_method"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const hbs = create({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: "./views/layouts/",
});

app.engine(".hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", "./views");

app.use(express.static("public"));

app.get("/", async(req, res) => {
    res.render("pagto");
});

app.get("/contratos", async(req, res) => {
    try {
        const dbRef = ref(db, "/contratos");
        const snapshot = await get(dbRef);

        if (!snapshot.exists()) {
            console.log("Dado não existente");
            const invoiceUrl = req.query.invoiceUrl;
            return res.render("home", {
                message: "Nenhum dado encontrado em /contratos",
                invoiceUrl,
            });
        }

        const data = snapshot.val();
        console.log("Sucesso ao recuperar dados:", data);

        const empresas = Object.entries(data).map(([key, contrato]) => ({
            chave: key,
            empresa: contrato.empresa,
        }));

        console.log("Nomes das empresas recuperados:", empresas);

        const invoiceUrl = req.query.invoiceUrl;
        res.render("home", { empresas, invoiceUrl });
    } catch (e) {
        console.error("Erro ao acessar o Firebase:", e);
        res.status(500).send("Erro ao acessar o Firebase.");
    }
});

app.post("/cad", async(req, res) => {
    const { aluno, orientador, empresa, agente } = req.body;

    if (!empresa || !aluno || !orientador || !agente) {
        console.log("Algum campo não preenchido.");
        return res.status(400).send("Preencha todos os campos.");
    }

    try {
        const dbRef = ref(db, "/contratos");

        const novoContrato = {
            agente,
            aluno,
            empresa,
            orientador,
        };

        await push(dbRef, novoContrato);

        console.log(`Empresa "${empresa}" adicionada com sucesso.`);

        // Redireciona para a página principal para atualizar a lista
        res.redirect("/contratos");
    } catch (e) {
        console.error("Erro ao adicionar empresa no Firebase:", e);
        res.status(500).send("Erro ao adicionar empresa.");
    }
});

app.post("/del", async(req, res) => {
    const { chave } = req.body;

    if (!chave) {
        console.log("Nenhuma empresa fornecida para exclusão.");
        return res.status(400).send("Empresa não fornecida.");
    }

    try {
        const dbRef = ref(db, "/contratos/" + chave);

        await remove(dbRef);

        console.log(`Empresa "${chave}" deletado com sucesso.`);

        res.redirect("/contratos");
    } catch (e) {
        console.error("Erro ao deletar empresa no Firebase:", e);
        res.status(500).send("Erro ao deletar empresa.");
    }
});

app.post("/editar", async(req, res) => {
    const { chave } = req.body;

    if (!chave) {
        console.log("Não possui chave.");
        return res.status(400).send("Necessita de chave para acessar contrato.");
    }

    try {
        const dbRef = ref(db, "/contratos");
        const snapshot = await get(dbRef);
        const data = snapshot.val();

        if (!data) {
            console.log("Nenhum dado encontrado.");
            return res.status(404).send("Dados não encontrados.");
        }

        console.log("Sucesso ao recuperar dados:", data);

        const contrato = Object.entries(data).find(([key]) => key === chave);

        if (!contrato) {
            console.log(`Contrato com chave "${chave}" não encontrado.`);
            return res.status(404).send("Contrato não encontrado.");
        }

        const [_, valores] = contrato;
        const dadosEdicao = {
            chave: chave,
            aluno: valores.aluno,
            empresa: valores.empresa,
            agente: valores.agente,
            orientador: valores.orientador,
        };

        console.log(`Empresa "${dadosEdicao.empresa}" encaminhada com sucesso.`);

        res.render("update", { dadosEdicao });
    } catch (e) {
        console.error("Erro ao recuperar contrato no Firebase:", e);
        res.status(500).send("Erro ao recuperar contrato.");
    }
});

app.post("/update", async(req, res) => {
    const { chave, aluno, orientador, empresa, agente } = req.body; // Alterei para req.body

    if (!chave) {
        console.log("Não possui chave.");
        return res.status(400).send("Necessita de chave para acessar contrato.");
    }

    try {
        const dbRef = ref(db, "/contratos");
        const snapshot = await get(dbRef);
        const data = snapshot.val();

        if (!data) {
            console.log("Nenhum dado encontrado.");
            return res.status(404).send("Dados não encontrados.");
        }

        console.log("Sucesso ao recuperar dados:", data);

        const contrato = Object.entries(data).find(([key]) => key === chave);

        if (!contrato) {
            console.log(`Contrato com chave "${chave}" não encontrado.`);
            return res.status(404).send("Contrato não encontrado.");
        }

        // Atualizando os dados do contrato
        const contratoRef = ref(db, `/contratos/${chave}`);
        await update(contratoRef, {
            aluno: aluno,
            orientador: orientador,
            empresa: empresa,
            agente: agente,
        });

        console.log(`Contrato com chave "${chave}" atualizado com sucesso.`);

        const successMessage = "Dados atualizados com sucesso.";

        const empresas = Object.entries(data).map(([key, contrato]) => ({
            chave: key,
            empresa: contrato.empresa,
        }));

        res.render("home", { successMessage, empresas });
    } catch (e) {
        console.error("Erro ao atualizar contrato no Firebase:", e);
        res.status(500).send("Erro ao atualizar contrato.");
    }
});

const ASAAS_API_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_ACCESS_TOKEN =
    "$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmZmNmE5MTFjLTc0NWUtNDU0OC04YTM2LTI2ZDM2NWY0MjFhZDo6JGFhY2hfMTk0OWRiZWItNTViNy00MjIzLTg1ZTItY2JlMDc5ZDU0YmVj";

app.post("/processar-pagamento", async(req, res) => {
    try {
        const {
            nome: name,
            cpf: cpfCnpj,
            numero_cartao: cardNumber,
            mes_expiracao: expiryMonth,
            ano_expiracao: expiryYear,
            cvv,
        } = req.body;

        // Criar cliente no Asaas
        const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                access_token: ASAAS_ACCESS_TOKEN,
            },
            body: JSON.stringify({ name, cpfCnpj }),
        });
        const customerData = await customerResponse.json();
        if (!customerData.id)
            throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerData)}`);

        // Criar cobrança
        const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                access_token: ASAAS_ACCESS_TOKEN,
            },
            body: JSON.stringify({
                billingType: "CREDIT_CARD",
                customer: customerData.id,
                value: 20,
                dueDate: "2026-06-08",
                description: "mudança para administrador",
            }),
        });
        const paymentData = await paymentResponse.json();
        if (!paymentData.id)
            throw new Error(`Erro ao criar cobrança: ${JSON.stringify(paymentData)}`);

        // Realizar pagamento
        const paymentMethodResponse = await fetch(
            `${ASAAS_API_URL}/payments/${paymentData.id}/payWithCreditCard`, {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "content-type": "application/json",
                    access_token: ASAAS_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    creditCard: {
                        number: cardNumber,
                        holderName: name,
                        expiryMonth,
                        expiryYear,
                        ccv: cvv,
                    },
                }),
            }
        );
        const paymentMethodData = await paymentMethodResponse.json();
        const invoiceUrl = paymentMethodData.invoiceUrl;
        if (paymentMethodData.status !== "CONFIRMED") {
            throw new Error(
                `Erro ao processar pagamento: ${JSON.stringify(paymentMethodData)}`
            );
        }

        console.log(paymentMethodData);
        res.redirect(
            `/contratos?invoiceUrl=${encodeURIComponent(
        paymentMethodData.invoiceUrl
      )}`
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});