import { RequestClass } from '../request';

const $R = new RequestClass({
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
  console.log(resPost);
  if (!res.err) {
    console.log('success');
  }
};
