/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import axios from "axios";
import { db } from "./firebase/index";
import {
  DocumentData,
  QuerySnapshot,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

class Node {
  data: any
  left: any
  right: any

  constructor(data: any) {
    this.data = data
    this.left = null
    this.right = null
  }
}

async function buildTreeFromFirestore(
  snapshot: QuerySnapshot<DocumentData, DocumentData>,
  rootId: string
) {
  const docs: any = {};
  snapshot.forEach((doc: any) => {
    docs[doc.id] = { id: doc.id, ...doc.data() };
  });

  const nodes: any = {};
  let rootDocId = rootId;
  let rootNode = null;

  for (const [docId, docData] of Object.entries(docs)) {
    nodes[docId] = new Node(docData);
    if (rootDocId === null) {
      rootDocId = docId;
    }
  }

  rootNode = nodes[rootDocId as string];
  const queue = [rootNode];

  let counter = 0

  while (queue.length > 0) {
    const node = queue.shift();
    const docData = node.data;
    const leftDocId = docData.left_binary_user_id;
    const rightDocId = docData.right_binary_user_id;
    counter++

    if (leftDocId && nodes[leftDocId]) {
      node.left = nodes[leftDocId];
      queue.push(node.left);
    }
    if (rightDocId && nodes[rightDocId]) {
      node.right = nodes[rightDocId];
      queue.push(node.right);
    }
  }

  return counter - 1;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("cryptoapisverifydomain")
  verifyDomain() {
    return "cryptoapis-cb-3c5ed9409121d6814c3c7383372faefb3ed72ccc4775a42c56c49e92949fc616";
  }

  @Post("callbackPayment")
  async callbackPayment(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post("https://onconfirmedtransaction-mdx7upthia-uc.a.run.app", body, {
        headers: {
          "x-signature": headers["x-signature"],
        },
      })
      .then((r) => r.data);
  }

  @Post("callbackCoins")
  async callbackCoins(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post("https://onconfirmedcoins-mdx7upthia-uc.a.run.app", body, {
        headers: {
          "x-signature": headers["x-signature"],
        },
      })
      .then((r) => r.data);
  }

  @Post("createPaymentAddress")
  async create(@Body() body) {
    return axios
      .post("https://createpaymentaddress-mdx7upthia-uc.a.run.app", body)
      .then((r) => r.data);
  }

  @Get("getFees")
  async getFees() {
    return axios
      .get("https://getfees-mdx7upthia-uc.a.run.app")
      .then((r) => r.data);
  }

  @Post("callbackSendedCoins")
  async callbackSendedCoins(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post("https://onconfirmsendedcoins-mdx7upthia-uc.a.run.app", body, {
        headers: {
          "x-signature": headers["x-signature"],
        },
      })
      .then((r) => r.data);
  }

  @Post("execPayroll")
  async execPayroll(@Body() body){
    return axios.post('https://payroll-mdx7upthia-uc.a.run.app').then(r => r.data)
  }

  @Post("fix_counter")
  async fixCounter() {
    const users = await getDocs(collection(db, "users"));
    const _users = [];
    for (const doc of users.docs) {
      const user = { id: doc.id, ...doc.data() };
      _users.push(user);
    }
    console.log(users.size)
    const result = await Promise.all(_users.map(async (doc) => ({
      id: doc.id,
      name: doc.name,
      email: doc.email,
      count_direct_people: await getDocs(query(collection(db, "users"), where("sponsor_id", "==", doc.id))).then(r => r.size),
      count_underline_people: await buildTreeFromFirestore(users, doc.id),
    })));

    for(const r of result) {
      await setDoc(doc(db, `users/${r.id}`), {
        count_direct_people: r.count_direct_people,
        count_underline_people: r.count_underline_people
      }, {
        merge: true
      })
    }

    return result
  }
}
