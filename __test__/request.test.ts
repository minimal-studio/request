import {
  RequestClass
} from '../src/request';

const getClientFingerprint = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('sdhuihqwirhqowirh');
    }, 300)
  })
}

describe('Testing RESTFul', () => {
  test('Get items', (done) => {
    const $R = new RequestClass();
    const setFPHeader = async (data) => {
      const fingerprint = await getClientFingerprint();
      $R.setConfig({
        // commonHeaders: {
        //   FP: fingerprint
        // }
      });
      return data;
    };
    
    $R.useBefore(setFPHeader);

    $R.get({
      url: '/test',
      params: {
        id: '123'
      }
    })
    .then((resData) => {
      expect(resData).toBe('peanut butter');
      done();
    })
  });
});
