import { Injectable } from '@nestjs/common';
import { CustomerInput } from './customers_schema';
import { GraphQLClient, createGraphQLClient } from '@shopify/graphql-client';
import {
  DraftOrderInput,
  ListItem,
  ResponseCreate,
  ResponseCreateDraf,
} from './types';

const store_name = '79ca82-85';

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

    console.log(customer);

    const { data, errors, extensions } =
      await this.client.request<ResponseCreate>(customerQuery, {
        variables: {
          input: customer,
        },
      });

    if (errors) {
      console.log(errors);
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

  async createDraftOrder(draf: DraftOrderInput) {
    if (draf.lineItems.some((r) => !r.variantId.startsWith('gid://shopify/')))
      throw new Error('Invalid Variant Shopify Global ID');

    const query = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
            status
            totalPrice
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const { data, errors, extensions } =
      await this.client.request<ResponseCreateDraf>(query, {
        variables: {
          input: draf,
        },
      });

    console.log(errors, data?.draftOrderCreate?.userErrors);

    if (errors?.message) {
      console.log(
        errors.graphQLErrors[0].message,
        errors.graphQLErrors[0].extensions,
      );
      throw new Error(errors.message);
    }

    const draftOrder = data.draftOrderCreate.draftOrder;

    await this.convertDraftToOrder(draftOrder.id);

    return draftOrder;
  }

  async convertDraftToOrder(id: string) {
    const query = `
      mutation draftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
            # DraftOrder fields
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const { data, errors, extensions } = await this.client.request(query, {
      variables: {
        id,
      },
    });

    console.log(data, errors);
  }
}
