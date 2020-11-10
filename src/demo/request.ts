import { RequestClass } from '../request';

const $R = new RequestClass<{}, {
  businessOptions: {
    code: string;
  };
}>({
  baseUrl: '',
  fetchOptions: {
    credentials: 'include'
  }
});

interface LoginRes {
  username: string;
  sessionID: string;
}

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
  const resPost = await $R.post<LoginRes>('/login', {});
  $R.post('/post', {}, { businessOptions: { code: '123' } });
  $R.post({
    url: '/post',
    data: {},
    options: {
      businessOptions: { code: '123' }
    }
  });
  console.log(resPost);
  if (!res.err) {
    console.log('success');
  }
};
