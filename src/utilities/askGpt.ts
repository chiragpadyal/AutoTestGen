const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

export default function askGpt(prompt: string): Promise<string> {
    const PAT = process.env.CLARIFAI_PAT;
    const USER_ID = 'openai';
    const APP_ID = 'chat-completion';
    const MODEL_ID = 'GPT-3_5-turbo';
    const MODEL_VERSION_ID = '4471f26b3da942dab367fe85bc0f7d21';
    const stub = ClarifaiStub.grpc();

    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Key " + PAT);

    return new Promise((resolve, reject) => {
        stub.PostModelOutputs(
            {
                user_app_id: {
                    "user_id": USER_ID,
                    "app_id": APP_ID
                },
                model_id: MODEL_ID,
                version_id: MODEL_VERSION_ID, // This is optional. Defaults to the latest model version.
                inputs: [
                    {
                        "data": {
                            "text": {
                                "raw": prompt
                            }
                        }
                    }
                ]
            },
            metadata,
            (err: any, response: any) => {
                if (err) {
                  reject(new Error(`Clarifai API error: ${err.message}`));
                } else if (response.status.code !== 10000) {
                  reject(new Error(`Clarifai API failed, status: ${response.status.description}`));
                } else {
                  const output = response.outputs[0];
                  if (!output || !output.data || !output.data.text || !output.data.text.raw) {
                    reject(new Error('Invalid response from Clarifai API'));
                  } else {
                    resolve(output.data.text.raw);
                  }
                }
              }
        );
    });
}