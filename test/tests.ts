import Router from '../src';

QUnit.test('Test It All', async (assert) => {
  const done = assert.async();
  // eslint-disable-next-line prefer-const
  let unmount: { (): void };
  const router = new Router({
    on404: (params, hash) => {
      document.title = 'Test: 404';
      assert.deepEqual(params, {}, 'empty params');
      assert.deepEqual(hash, '/from-404', 'the unknown path');
      unmount();
      done();
    },
  });
  router.on('/', (params, hash) => {
    document.title = 'Test: Home';
    assert.deepEqual(params, {}, 'empty params');
    assert.deepEqual(hash, '/', 'the root path');
  });
  router.on('/from-a-click/:answer', (params, hash) => {
    document.title = 'Test: Click';
    assert.deepEqual(params, { answer: '42' }, 'the answer');
    assert.deepEqual(hash, '/from-a-click/42', 'the path from the href');
    setTimeout(() => {
      router.go('/from-go/43');
    }, 100);
  });
  router.on('/from-go/:answer', (params, hash) => {
    document.title = 'Test: Go';
    assert.deepEqual(params, { answer: '43' }, 'the answer');
    assert.deepEqual(hash, '/from-go/43', 'the path from go');
    router.go('/from-404');
  });
  unmount = router.mount();
  (document.querySelector('#start-it') as HTMLAnchorElement)!.click();
});
