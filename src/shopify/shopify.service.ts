import { Injectable } from '@nestjs/common';
import { CustomerInput } from './customers_schema';
import { GraphQLClient, createGraphQLClient } from '@shopify/graphql-client';

const store_name = '79ca82-85';

type ListItem = {
  id: string;
  quantity: number;
};

type ResponseCreate = {
  customerCreate: {
    customer: {
      id: string;
    };
    userErrors: {
      field: string[];
      message: string;
    }[];
  };
};

@Injectable()
export class ShopifyService {
  client: GraphQLClient;

  constructor() {
    this.client = createGraphQLClient({
      url: `https://${store_name}.myshopify.com/admin/api/2023-10/graphql.json`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_APITOKEN,
      },
      retries: 1,
    });
  }

  sendOrder(id_customer_shopify: string, products: ListItem[]) {
    //
  }

  async createCustomer(customer: CustomerInput) {
    const customerQuery = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

    const { data, errors, extensions } =
      await this.client.request<ResponseCreate>(customerQuery, {
        variables: {
          input: customer,
        },
      });

    if (errors) {
      console.log(errors.message);
      throw new Error('No se pudo crear el cliente');
    } else if (
      data.customerCreate.userErrors &&
      data.customerCreate.userErrors.length > 0
    ) {
      console.log(data.customerCreate.userErrors);
      throw data.customerCreate.userErrors[0].message;
    }

    return data.customerCreate.customer;
  }
}
