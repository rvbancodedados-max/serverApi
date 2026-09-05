import dotenv from "dotenv"
import { fastify } from "fastify";
import { MongoClient } from "mongodb";
import cors from '@fastify/cors'

dotenv.config()
const server = fastify({ logger: true });
const ACCESS_TOKEN = process.env.ACCESS_TOKE;
const URL = process.env.URL

let client;
let clientPromise;

await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});


if (!clientPromise) {
    client = new MongoClient(URL);
    clientPromise = client.connect()
}

server.get('/fotosInstagram', async (request, reply) => {

    try {
        const fotos = []
        const apiGraph = async () => {
            let nextUrl = `https://graph.instagram.com/me/media?fields=id,media_url,media_type&access_token=${ACCESS_TOKEN}`;
            while (nextUrl) {
                const res = await fetch(nextUrl)
                const dataFotos = await res.json()
                fotos.push(...dataFotos.data.filter(foto => foto.media_type === "IMAGE"))
                fotos.includes(...dataFotos.data.filter(foto => foto.media_type === "CAROUSEL_ALBUM"))
                fotos.includes(...dataFotos.data.filter(fotoId => fotoId.idInstagram !== fotoId.idInstagram))
                nextUrl = dataFotos.paging?.next || null    
            }
            return reply.send(fotos)

        }
        await apiGraph()

        const client = await clientPromise;
        const db = client.db("rvDecoracaoes");
        const fotosNovas = []


        for (const foto of fotos) {
            const idExistente = await db.collection("dadosServer").findOne({
                idInstagram: foto.id
            })

            if (!idExistente) {
                fotosNovas.push({
                    idInstagram: foto.id,
                    url: foto.media_url,
                    tipo: foto.media_type,
                    title: "",
                    description: "",
                    value: 0,
                    category: "",
                    itens: ""
                })
            }

        }
        if (fotosNovas.length > 0) {
            await db.collection("dadosServer").insertMany(fotosNovas);

        }
        

    } catch (error) {
        console.log(error)
        return reply.status(500).send({
            error: "Erro na busca"
        })
    }



    return reply.status(201).send()

})


server.get('/dadosMongoDb', async (resquest, reply) => {
    try {
        await client.connect()

        const dataBase = client.db('rvDecoracaoes')
        const collection = dataBase.collection('dadosServer')

        const data = await collection.find({}).toArray()
        return reply.status(201).send(data)

    } catch (error) {
           console.error("Erro ao buscar dados:", error);

        return reply.status(500).send({
            erro: "Erro ao buscar dados no MongoDB",
            mensagem: error.message
        });
    }

})



server.put('/fotosInstagram/:id', async (request, reply) => {
    const db = client.db("rvDecoracaoes");
    const id = request.params.id

    const {
        title,
        description,
        value,
        category,
        itens
    } = request.body
 
    const resultado = await db.collection("dadosServer").updateOne(
        {
            idInstagram: id
        },
        {
            $set: {
                title: title,
                description: description,
                value: value,
                category: category,
                itens: itens
            }
        }
    )




    console.log(resultado)


    return reply.status(204).send()
})



server.listen({
    port: 3321
})