/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {assert, expect} from 'chai';
import sinon from 'sinon';
import Cache from '../lib/cache';
import getStore from '../lib/store';

describe('Cache', function () {

  let cache;
  let store;

  beforeEach(function () {
    cache = new Cache('prefix', getStore());
    store = {};
    cache.store = store;
  });

  it('save value with prefix', async function () {
    store.setPurgeableItem = sinon.stub();
    store.setPurgeableItem.returns(Promise.resolve());

    await cache.set('hash', {some: 'json'});
    expect(store.setPurgeableItem)
      .to.be.calledWithMatch('prefix:hash', '{"some":"json"}');
  });

  it('get value with prefix', async function () {
    store.getItem = sinon.stub();
    store.getItem.returns(Promise.resolve('{"some":"json"}'));

    const myValue = await cache.get('hash');
    expect(store.getItem).to.be.calledWithMatch('prefix:hash');
    expect(myValue).to.be.eql({
      some: 'json'
    });
  });

  it('rejects when cache is not found', async function () {
    store.getItem = sinon.stub();
    store.getItem.returns(Promise.resolve(null));

    try {
      await cache.get('hash');
      assert.fail('should fail');
    } catch (error) {
      // expected
    }
  });

  function testRetryForMaxRetryCount(maxRetryCount) {
    const description =
      'retries ' + maxRetryCount + ' times when write failed with ' +
      '_maxRetryCount = ' + maxRetryCount;

    it(description, async function () {
      cache._maxRetryCount = maxRetryCount;
      store.setPurgeableItem = sinon.stub();

      for (let i = 0; i < maxRetryCount; ++i) {
        store.setPurgeableItem.onCall(i).returns(Promise.reject(new Error()));
      }
      store.setPurgeableItem.onCall(maxRetryCount).returns(Promise.resolve());

      await cache.set('hash', {some: 'json'});
      expect(store.setPurgeableItem).to.be.callCount(maxRetryCount + 1);
    });
  }
  for (let i = 0; i < 4; ++i) {
    testRetryForMaxRetryCount(i);
  }

});
