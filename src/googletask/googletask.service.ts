import { Injectable } from '@nestjs/common';
import path from 'path';
import { CloudTasksClient } from '@google-cloud/tasks';
import { google } from '@google-cloud/tasks/build/protos/protos';

const options = {
  keyFilename: path.resolve(__dirname, '../firebase/adminKeyProd.json'),
  projectId: 'topx-academy',
};

const project = options.projectId;
const location = 'us-central1';
const queue = '';

@Injectable()
export class GoogletaskService {
  tasksClient: CloudTasksClient;
  parent: string;

  constructor() {
    this.tasksClient = new CloudTasksClient(options);
    this.parent = this.tasksClient.queuePath(project, location, queue);
  }

  getPathQueue(queueName: string): string {
    return this.tasksClient.queuePath(project, location, queueName);
  }

  async addToQueue(task: google.cloud.tasks.v2.ITask, queuePath: string) {
    const qrequest: google.cloud.tasks.v2.ICreateTaskRequest = {
      parent: queuePath,
      task: task,
    };

    // Send create task request.
    const [response] = await this.tasksClient.createTask(qrequest);
    const name = response.name;
    console.log(`Created task ${name}`);
  }
}
