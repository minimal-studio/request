import { RequestClass } from '../request';

const $R = new RequestClass();

const APIDemo = async () => {
  const res = await $R.request<{err: boolean}>({
    url: 'asd',
    method: 'POST',
    data: {

    }
  });
  const resGet = await $R.get({
    url: 'asd',
    method: 'POST',
    data: {

    }
  });
  console.log(resGet);
  if (!res.err) {
    console.log('success');
  }
};
