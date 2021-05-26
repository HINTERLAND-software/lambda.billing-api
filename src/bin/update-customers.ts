import { upsertCustomer } from '../libs/debitoor';
import env from '../../.env.json';

const run = async () => {
  for (let i = 0; i < env.customers.length; i++) {
    const customer = env.customers[i];
    const extra = customer.notesObject.extra
      ? `\n${customer.notesObject.extra}`
      : '';
    delete customer.notesObject.extra;
    const notes = `[[${JSON.stringify(customer.notesObject)}]]${extra}`;

    (customer as any).notes = notes;
    delete customer.notesObject;

    const res = await upsertCustomer(customer as any);
    if (res.notes !== notes) {
      throw new Error(`Error updating ${res.name} - .notes not equal`);
    }
    console.log(`Updated ${res.name}`);
  }
};

run().catch(console.error);
