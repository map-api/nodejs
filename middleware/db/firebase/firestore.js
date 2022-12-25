import { initializeApp } from "firebase/app";
import PROCESS_EXIT_CODE from "../../../core/enum/processExitCode.js";
import NullOrUndefinedException from "../../../exception/nullOrUndefinedException.js";
import InvalidSqlInsertExecuteException from "../../../exception/InvalidSqlInsertExecuteException.js";
import { objectKeysToArray } from "../../../core/utils.js";
import ModelConfigReader from "../../../core/modelReader.js";
import ConfigReader from "../../../core/configReader.js";
import HTTP_RESPONSE from "../../../core/enum/httpResponse.js";
import firebaseConfig from "../../../configs/firestore.json" assert { type: "json" };

import {
  collection,
  doc,
  setDoc,
  getFirestore,
  query,
  startAfter,
  getDocs,
  addDoc,
  where,
  deleteDoc,
  connectFirestoreEmulator,
  limit,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { refFromURL } from "firebase/database";

const baseConfigReader = new ConfigReader();
export default class FirestoreAccessor {
  constructor() {
    this.dbinfo = baseConfigReader.configInfo.get("general")["database"];
  }

  async initTest() {
    const firebaseConfigs = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId,
    };
    //initialize firebase

    try {
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

    if (condition && condition.page) delete condition.page;
    const queryz = condition ? condition : {};

    const queryConstraints = [];
    for (let key in condition) {
      queryConstraints.push(where(key, "==", condition[key]));
    }
    const db = getFirestore(this.firebase);

    let result = [];
    let return_Val = {};

    if (paging["pagination-value"]) {
      var page_count = parseInt(paging["count"]);
      var page_number = parseInt(paging["pagination-value"]);
      if (page_number == 1) {
        const q = query(
          collection(db, collections),
          ...queryConstraints,
          limit(page_count)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docs) => {
          const lists = Object.keys(docs.data());
          let res = {};
          lists.forEach((val) => {
            res[val] = docs.data()[val];
          });

          result.push(res);
        });
      } else {
        var num = page_count * (page_number - 1);
        const q = query(
          collection(db, collections),
          ...queryConstraints,
          limit(num)
        );
        const querySnapshot = await getDocs(q);

        const last = querySnapshot.docs[querySnapshot.docs.length - 1];
        const qury = query(
          collection(db, collections),
          startAfter(last),
          limit(page_count)
        );

        const nextr = await getDocs(qury);
        nextr.forEach((docs) => {
          const lists = Object.keys(docs.data());
          let res = {};
          lists.forEach((val) => {
            res[val] = docs.data()[val];
          });
          result.push(res);
        });
      }
    } else {
      const q = query(collection(db, collections), ...queryConstraints);
      const querySnapshot = await getDocs(q)
        .then((e) => {
          e.forEach((docs) => {
            const lists = Object.keys(docs.data());
            let res = {};
            lists.forEach((val) => {
              res[val] = docs.data()[val];
            });
            result.push(res);
          });
        })
        .catch((e) => {
          console.error(e);
          return {
            affectedRows: 0,
            success: false,
            code: 400,
            message: "Request body failed validation",
          };
        });
    }
    /*Select 남은것  prev url-> next url전달하기 page_num 주어졌을때 +-1 하면됨!!*/
    return result;
  }

  async insert(collections, fieldList, valueList, modelObject) {
    if (!fieldList || !valueList || fieldList.length != valueList.length) {
      throw new InvalidSqlInsertExecuteException(
        `FieldList ${fieldList} or ValueList ${valueList} is null || Size of FieldList and ValueList are not match.`
      );
    }

    let data_set = {};
    var idx = 0;

    fieldList.forEach((field) => {
      data_set[field] = valueList[idx];
      idx++;
    });

    const db = getFirestore(this.firebase);
    const ref = collection(db, collections);
    let result;
    let kk = {};
    try {
      console.log("z");
      result = await addDoc(collection(db, collections), data_set).then((e) => {
        const return_val = {
          code: 201,
          insertId: e.id,
          affectedRows: 1,
          document: data_set,
          firestore: true,
        };

        kk = return_val;
        console.log("rere");
        console.log(kk);
      });
    } catch (error) {
      return {
        code: 400,
        message: "Request body failed validation",
        success: false,
        affectedRows: 0,
      };
    }

    result = kk;
    console.log(result);
    return result;
  }

  async update(
    collections,
    fieldList,
    valueList,
    condition,
    modelObject,
    queryOption
  ) {
    if (!fieldList || !valueList || fieldList.length != valueList.length) {
      throw new InvalidSqlInsertExecuteException(
        `ColumnList(${fieldList}) or DataList(${valueList}) is null. Or size of ColumnList and DataList are not match.`
      );
    }

    const queryConstraints = [];

    let data_set = {};
    var idx = 0;
    fieldList.forEach((field) => {
      data_set[field] = valueList[idx];
      idx++;
    });
    for (let key in condition) {
      queryConstraints.push(where(key, "==", condition[key]));
    }
    const db = getFirestore(this.firebase);
    const q = query(collection(db, collections), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    let kk = {};
    if (querySnapshot.docs.length == 0) {
      //code 201
      var code = 201;
      //새로Adddoc해주기!
      const ref = collection(db, collections);
      await addDoc(ref, data_set)
        .then((e) => {
          const return_val = {
            code: 201,
            insertId: e.id,
            affectedRows: 1,
            document: data_set,
            firestore: true,
          };
          kk = return_val;
        })
        .catch((error) => {
          return_val = {
            code: 400,
            message: "Request body failed validation",
            success: false,
            affectedRows: 0,
          };
          kk = return_val;
        });
    } else {
      var code = 200;
      const last = querySnapshot.docs[0];
      const lists = Object.keys(last.data());
      let res = {};
      lists.forEach((val) => {
        res[val] = last.data()[val];
      });
      idx = 0;
      fieldList.forEach((field) => {
        res[field] = valueList[idx];
        idx++;
      });
      var val_ = [];
      await updateDoc(doc(db, collections, last.id), data_set)
        .then((e) => {
          const result = {
            code: code,
            affectedRows: fieldList.length,
            acknowledged: true,
            document: data_set,
            mongo: true,
          };
          kk = result;
        })
        .catch((error) => {
          const result = {
            affectedRows: 0,
            success: false,
            code: 400,
            message: "Request body failed validation",
          };
          kk = result;
        });
    }
    return kk;
  }

  async delete(table, condition) {
    console.log("여기왜안됨?");
    const queryConstraints = [];
    console.log(table);
    console.log(condition);
    for (let key in condition) {
      queryConstraints.push(where(key, "==", condition[key]));
    }
    const db = getFirestore(this.firebase);
    const q = query(collection(db, table), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    var idx = querySnapshot.docs.length;
    querySnapshot.forEach((docs) => {
      const ks = deleteDoc(doc(db, table, docs.id))
        .then((i) => {})
        .catch((error) => {
          return {
            code: 204,
            message: HTTP_RESPONSE[204],
          };
        });
    });
    return { code: 204, message: HTTP_RESPONSE[204] };
  }
}
