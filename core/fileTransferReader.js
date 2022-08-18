import apiType from './enum/apiType.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import OutofConfigKeyException from '../exception/outofConfigKeyException.js';
import FileConfigObject from '../data/object/fileTransferConfigObject.js';
import ModelConfigReader from './modelReader.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_PATH = path.join(__dirname, '..', 'configs', 'controller', 'file');

let configsInApi;

const allowedFormat = [
    "id", "type", "auth", "proxy-list", "proxy-order", "log", "uri", "model", "dml"
]

export default class FileTransferConfigReader{
    static instance;

    constructor(){
        if(FileTransferConfigReader.instance) return FileTransferConfigReader.instance;
        this.readConfigs();
        FileTransferConfigReader.instance = this;
    }
    
    readConfigs(){
        this.configInfo = new Map();

        configsInApi = fs.readdirSync(BASE_PATH).filter(file => path.extname(file) === '.json');
        configsInApi.forEach(file => {
            const fileData = fs.readFileSync(path.join(BASE_PATH, file));
            const jsonData = JSON.parse(fileData.toString());
            this.checkValidity(jsonData);
            
            const oneObject = new FileConfigObject(
                jsonData.id,
                jsonData.type,
                jsonData.auth,
                jsonData['proxy-list'],
                jsonData['proxy-order'],
                jsonData.log,
                jsonData.uri,
                jsonData.model,
                jsonData.dml
            );
            
            if(oneObject.data.uri.includes('@') || oneObject.data.id.includes ('@')){
                console.warn(`Attribute [uri] and [id] must not include '@' word.`);
                console.warn(`The configId ${oneObject.data.uri} + '@' + ${oneObject.data.id} will not be registered.`);
                return;
            }

            let configId = oneObject.data.uri + '@' + oneObject.data.id;
            if(this.configInfo.get(configId)){
                console.warn(`API Config is duplicated. The new config ${configId} will be set.`); 
                console.warn(`To prevent API Config duplication, please set the concatenation of uri and id into unique string.`);
            }
            this.configInfo.set(configId, oneObject);
        });
    };

    getConfig(key){
        return this.configInfo.get(key);
    };

    setRouter(app){

    }

    modelCheck(){
        let _configInfo = FileTransferConfigReader.instance.configInfo;
        
        let keys = _configInfo.keys();
        let _key = null;
        
        while( (_key = keys.next().value) ){
            let oneObject = _configInfo.get(_key);
            let modelId = oneObject.data.model;
            let model = new ModelConfigReader().getConfig(modelId);
            console.log(`Model [${modelId}] checking...`);
            if(!model){
                throw new NoModelFoundException(
                    `No Model is Found for FTP Config -> ${modelId}`
                );
            }
            console.log(`Model [${modelId}] Ok!`);
        }
    }

    printConfigs(){
        console.log(this.configInfo);
    };

    checkValidity(json){
        let i_list = [allowedFormat];
        for(let i = 0; i < i_list.length; i++){
            let current_object = i_list[i];

            for(let index in current_object){
                if(!json[current_object[index]]){

                    throw new OutofConfigKeyException(
                        `Out of Key '${current_object[index]}' for '${apiType.MODEL}' config file.`
                    );
                }
            }
        }
    };
}