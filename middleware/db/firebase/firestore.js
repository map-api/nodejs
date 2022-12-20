import { initializeApp } from "firebase/app";
import PROCESS_EXIT_CODE from "../../../core/enum/processExitCode.js";
import NullOrUndefinedException from "../../../exception/nullOrUndefinedException.js";
import InvalidSqlInsertExecuteException from "../../../exception/InvalidSqlInsertExecuteException.js";
import { objectKeysToArray } from "../../../core/utils.js";
import ModelConfigReader from "../../../core/modelReader.js";
import ConfigReader from "../../../core/configReader.js";
import HTTP_RESPONSE from '../../../core/enum/httpResponse.js';
import firebaseConfig from '../../../configs/firestore.json' assert {type:"json"};


import { collection, doc, setDoc,getFirestore,query,startAfter,getDocs,addDoc,where,deleteDoc, connectFirestoreEmulator ,limit, orderBy  } from "firebase/firestore"; 


const baseConfigReader = new ConfigReader();
export default class FirestoreAccessor {
    constructor() {
      this.dbinfo = baseConfigReader.configInfo.get("general")["database"];
    }
  
    //init
    async initTest() {
        const firebaseConfigs = {
          apiKey: firebaseConfig.firebaseConfig.apiKey,
          authDomain: firebaseConfig.firebaseConfig.authDomain,
          projectId: firebaseConfig.firebaseConfig.projectId,
          storageBucket: firebaseConfig.firebaseConfig.storageBucket,
          messagingSenderId: firebaseConfig.firebaseConfig.messagingSenderId,
          appId: firebaseConfig.firebaseConfig.appId,
          measurementId: firebaseConfig.firebaseConfig.measurementId,
        };
        //initialize firebase
    
        try {
          console.log(this.dbinfo.appId);
    
          this.firebase = initializeApp(firebaseConfigs);
        } catch (e) {
          console.log(e.message.toString());
          console.log("initialize error firebase");
          return PROCESS_EXIT_CODE.DB_FAIL_TO_CONNECT;
        }
    
        try {
          this.database = getFirestore(this.firebase);
        } catch (e) {
          console.log("db firestore.json file error");
          return PROCESS_EXIT_CODE.DB_ACCESS_DENIED;
        }
    
        //잘됫음 flag=0;
    
        return 0;
      }
      async jwtAuthorize(table, keyColumns, selectColumns, body) {
        if (!table || !keyColumns) {
          throw new NullOrUndefinedException(
            `Table(${table}) or Key Columns(${keyColumns}) is Null.`
          );
        }
        if (!body) {
          throw new NullOrUndefinedException(
            `Body parameter(${body}) for JWTAuthorize is Null.`
          );
        }
        let cond = "";
        // size: 5
        let _value = [];
        for (let i = 0; i < keyColumns.length; i++) {
          cond += `${keyColumns[i]} = ?`;
          _value.push(body[keyColumns[i]]);
          if (i < keyColumns.length - 1) {
            cond += " AND ";
          }
        }
        let _columns = "";
        for (let i = 0; i < selectColumns.length; i++) {
          _columns += `${selectColumns[i]}`;
          if (i < selectColumns.length - 1) {
            _columns += ", ";
          }
        }
    
        let conn = await pool.getConnection();
        let result = await conn.query(
          `SELECT ${_columns} FROM ${table} WHERE ${cond}`,
          _value
        );
        conn.close();
        conn.end();
    
        return result;
      }



      async select(collections, fieldList, condition, paging) {
        if (!fieldList) {
          throw new NullOrUndefinedException(
            `Column should be specified in [Model] for REST API`
          );
        }

        if(condition && condition.page)  delete condition.page;
        const queryz = condition ? condition : {};
   
        const queryConstraints = [];
        for(let key in condition)
        {
        queryConstraints.push(where(key, '==', condition[key]));
        }
        const db = getFirestore(this.firebase);
       
        let result=[];
        let return_Val={};
        
        if(paging['pagination-value'])
        {
            
          
            var page_count=parseInt(paging['count']);
            var page_number=parseInt(paging['pagination-value']);
            
            if(page_number==1)
            {
                const q = query(collection(db,collections),...queryConstraints,limit(page_count));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((docs)=>{
        
                  const lists=Object.keys(docs.data());
                  let res={};
                  lists.forEach((val)=>{
                 
                
                  res[val]=docs.data()[val];
                 
                  });
                  
                  result.push(res);
              });
            }
            else{
                var num=page_count*(page_number-1);
                const q = query(collection(db,collections),...queryConstraints,limit(num));
                const querySnapshot = await getDocs(q);
                
                const last = querySnapshot.docs[querySnapshot.docs.length - 1]; 
                const qury=query(collection(db,collections),startAfter(last),limit(page_count));

                const nextr =await getDocs(qury);
                nextr.forEach((docs)=>{
                    const lists=Object.keys(docs.data());
                    let res={};
                    lists.forEach((val)=>{
                   
                  
                    res[val]=docs.data()[val];
                   
                    });
                    
                    result.push(res);
                    
                   });
                

            }
            
        }
        else
        {
    
         const q = query(collection(db,collections),...queryConstraints);
           const querySnapshot = await getDocs(q);
           querySnapshot.forEach((docs)=>{
        
               const lists=Object.keys(docs.data());
          console.log(lists);
          let res={};
            lists.forEach((val)=>{
          
          res[val]=docs.data()[val];
          
          
          });
          
          result.push(res);
         });


        }
     

      /*Select 남은것  prev url-> next url전달하기 page_num 주어졌을때 +-1 하면됨!!*/
return result;
    }    

    async insert(collections, fieldList, valueList, modelObject){

      if(!fieldList || !valueList || (fieldList.length != valueList.length)){
        throw new InvalidSqlInsertExecuteException(
            `FieldList ${fieldList} or ValueList ${valueList} is null || Size of FieldList and ValueList are not match.`
        );
    }

    let data_set={};
    var idx=0;
    fieldList.forEach((field)=>{

      
data_set[field]=valueList[idx];
idx++;

    });
    const db = getFirestore(this.firebase);
      
    const ref=collection(db,collections);
    let result;
   let kk={};
    try{
         result=await addDoc(ref,data_set).then((e)=>{
                   
    const return_val={
        code:201,
        insertId: e.id,
        affectedRows:1,
        document:data_set,
        firestore:true };

        kk=return_val;
       
    });
    }catch(error){
      return {
        code: 400,
        message: "Request body failed validation",
        success:false,
        affectedRows:0
      }
    }
 
    result=kk;

return result;
    
    }
  



    async update(collection, fieldList, valueList, condition, modelObject,queryOption){
      if(!fieldList || !valueList || (fieldList.length != valueList.length)){
        throw new InvalidSqlInsertExecuteException(
            `ColumnList(${fieldList}) or DataList(${valueList}) is null. Or size of ColumnList and DataList are not match.`
        );
    }
    //먼저 있는지확인 -> ?몇개?
    //-> 있으면 값바꾸기
    //없으면 생성
    //get
    //a-> a 10개바꿀거야?
    //a-> a 10
    //size:10

    //delete -> 전부 다삭제
    console.log("필드리스트");
    console.log(fieldList);
    console.log(valueList);
    console.log(condition);
    console.log(modelObject);
    console.log(queryOption);



    }


    async delete(table, condition){

      const queryConstraints = [];
      for(let key in condition)
      {
      queryConstraints.push(where(key, '==', condition[key]));
      }
      const db = getFirestore(this.firebase);
      const q = query(collection(db,table),...queryConstraints);

      const querySnapshot = await getDocs(q);
      var idx=querySnapshot.docs.length;

      
      querySnapshot.forEach((docs)=>{
        
        const ks=deleteDoc(doc(db,table, docs.id)).then((i)=>{

  
        }).catch((error)=>{
          
          return  {
            code: 204,
            message: HTTP_RESPONSE[204]
        }
        });
         
     
      
    });
      return {code: 204,message: HTTP_RESPONSE[204]}; 


  }
}
  

  