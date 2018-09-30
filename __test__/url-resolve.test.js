import {
  resolveUrl
} from '../src/url-resolve';

describe('Testing url resolver', () => {
  test('resolveUrl ["http://abc.com", "path1", "path2" to "http://abc.com/path1/path2"]', () => {
    expect(resolveUrl("http://abc.com", "path1", "path2")).toMatch('http://abc.com/path1/path2');
  });
});