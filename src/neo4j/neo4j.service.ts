import { Injectable } from '@nestjs/common';
import neo4j, { Driver } from 'neo4j-driver';

const URI = 'neo4j+s://c7c8fc0b.databases.neo4j.io';
const USER = 'neo4j';
const PASSWORD = 'Z7iM19v-8eSNsOjlgTLvzKT7H9IPr_xUvUZQxTqbcVE';

type BinaryUser = {
  id: string;
  name: string;
  sponsor_id: string;
  left_binary_user_id: string | null;
  right_binary_user_id: string | null;
  parent_binary_user_id: string | null;
};

const DB_NAME = process.env.NODE_ENV == 'production' ? 'topx' : 'neo4j';
const DB_CONFIG = { database: DB_NAME };

@Injectable()
export class Neo4jService {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
    this.driver.getServerInfo().then(() => {
      console.log('Connection established');
    });
  }

  async createNewNode(node: BinaryUser) {
    const { records, summary } = await this.driver.executeQuery(
      `CREATE (p:Person {name: $name, firebaseId: $id, leftBinaryUserId: $leftId, rightBinaryUserId: $rightId, parentBinaryUserId: $parentId, sponsorId: $sponsorId})`,
      {
        name: node.name,
        id: node.id,
        leftId: node.left_binary_user_id,
        rightId: node.right_binary_user_id,
        parentId: node.parent_binary_user_id,
        sponsorId: node.sponsor_id,
      },
      DB_CONFIG,
    );
    console.log(records);
    console.log(summary);
  }

  async getLastNode(startNodeId: string, side: 'left' | 'right') {
    const relation = side == 'left' ? 'LEFT_OF' : 'RIGHT_OF';
    const { records, summary } = await this.driver.executeQuery(
      `MATCH path=(startNode: User{ firebaseId: $startNodeId })<-[:${relation}*]-(farthestNode)
      RETURN farthestNode, length(path) as pathLength
      ORDER BY pathLength DESC
      LIMIT 1`,
      {
        startNodeId,
      },
      DB_CONFIG,
    );

    if (records[0]) {
      const [node, distance] = records[0].entries();
      return {
        user: node[1],
        distance: distance[1],
      };
    }

    return null;
  }

  /**
   *
   */
  async connectParentBinary(
    sponsorId: string,
    parentBinaryId: string,
    side: 'left' | 'right',
    childId: string,
  ) {
    const relation = side == 'left' ? 'LEFT_OF' : 'RIGHT_OF';
    const res = await this.driver.executeQuery(
      `MATCH (p: { firebaseId: $sponsorId })
      MATCH (l: { firebaseId: $childId })
      MERGE (p)-[:SPONSOR_OF]->(l)
      MERGE (l)-[:DIRECT_OF]->(p)
      RETURN *`,
      {
        sponsorId,
        childId,
      },
      DB_CONFIG,
    );
    const res2 = await this.driver.executeQuery(
      `MATCH (p: { firebaseId: $parentBinaryId })
        MATCH (l: { firebaseId: $childId })
        MERGE (p)-[:PARENT_OF]->(l)
        MERGE (l)-[:UNDER_OF]->(p)
        MERGE (l)-[:${relation}]->(p)
        RETURN *`,
      {
        parentBinaryId,
        childId,
      },
      DB_CONFIG,
    );
  }
}
