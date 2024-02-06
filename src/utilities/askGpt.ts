// import { GPT3 } from 'openai';
const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

export default function askGpt(prompt: string): string {

const PAT = '884e52ada8d0465da63c9ad67d5a277a';
const USER_ID = 'openai';
const APP_ID = 'chat-completion';
const MODEL_ID = 'GPT-3_5-turbo';
const MODEL_VERSION_ID = '4471f26b3da942dab367fe85bc0f7d21';


const stub = ClarifaiStub.grpc();

const metadata = new grpc.Metadata();
metadata.set("authorization", "Key " + PAT);

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
    (err: string, response: any) => {
        if (err) {
            throw new Error(err);
        }

        if (response.status.code !== 10000) {
            console.log(response)
            throw new Error("Post model outputs failed, status: " + response.status.description);
        }
        const output = response.outputs[0];
        return output.data.text.raw;
    }
    );
    
    return "Error";
}

