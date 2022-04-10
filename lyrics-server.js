import express from "express";
import { router } from "./router.mjs";

const port = process.env.NODE_ENV === 'production' ? 56733 : 56732;
const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

app.listen(port, () => console.log(`lyrics server is listening on ${port}`));

export { }
