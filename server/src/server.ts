import "dotenv/config";

import app from "./app";
import { dbHealthcheck } from "./db";

const port = process.env.PORT || 4000;

(async () => {
  await dbHealthcheck();
  app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
})();
