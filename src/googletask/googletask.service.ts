import { Injectable } from '@nestjs/common';
import { CloudTasksClient } from '@google-cloud/tasks';
import { google } from '@google-cloud/tasks/build/protos/protos';
import type { ClientOptions } from 'google-gax';

import adminCredentials from 'src/firebase/firebaseConfigAdmin';

const options: ClientOptions = {
  projectId: 'topx-academy',
  credentials: {
    client_email: adminCredentials.client_email,
    private_key: adminCredentials.private_key,
  },
};

const project = adminCredentials.project_id;
const location = 'us-central1';

@Injectable()
export class GoogletaskService {
  tasksClient: CloudTasksClient;

  constructor() {
    this.tasksClient = new CloudTasksClient(options);
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
