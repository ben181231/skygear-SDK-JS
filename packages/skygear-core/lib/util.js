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
import _ from 'lodash';
import Asset from './asset';
import Reference from './reference';
import Geolocation from './geolocation';
import Record, {isRecord} from './record';
import {UnknownValue, Sequence} from './type';
import { SkygearError, ErrorCodes } from './error';
import { isRole } from './role';

function mapObject(obj, fn) {
  // cannot use `map` directly
  // because array-like object would give integer key instead of string key
  // when calling map
  return _.chain(obj)
    .keys()
    .map((key) => {
      return [key, fn(key, obj[key])];
    })
    .fromPairs()
    .value();
}

/**
 * Returns the specified value to a JSON representation.
 *
 * It will descends into array and object to convert Skygear Data Type
 * into JSON representation. If the specified value is null, null is returned.
 *
 * The output of this function differ from Record.toJSON when specifying
 * a Record. This function will wrap a Record in JSON representation with
 * a `$type=record` object.
 *
 * This function is the opposite of fromJSON.
 *
 * @param {Object} v - the object or value value to convert to JSON
 * @return {Object} the result in JSON representation
 */
export function toJSON(v) {
  if (v === undefined) {
    throw new Error('toJSON does not support undefined value');
  }

  if (v === null) {
    return null;
  } else if (_.isArray(v)) {
    return _.map(v, toJSON);
  } else if (_.isDate(v)) {
    return {
      $type: 'date',
      $date: v.toJSON()
    };
  } else if (isRecord(v)) {
    return {
      $type: 'record',
      $record: v.toJSON()
    };
  } else if (v.toJSON) {
    return v.toJSON();
  } else if (_.isObject(v)) {
    return mapObject(v, (key, value) => toJSON(value));
  } else {
    return v;
  }
}

/**
 * Convert object from JSON representation
 *
 * It will descends into array and object to convert Skygear Data Type
 * from JSON representation. If the specified value is null, null is returned.
 *
 * This function is the opposite of toJSON.
 *
 * @param {Object} attrs - the object or value in JSON representation
 * @return {Object} the result in Skygear Data Type
 */
// eslint-disable-next-line complexity
export function fromJSON(attrs) {
  if (attrs === null) {
    return null;
  } else if (attrs === undefined) {
    return undefined;
  } else if (_.isArray(attrs)) {
    return _.map(attrs, fromJSON);
  } else if (_.isObject(attrs)) {
    switch (attrs.$type) {
    case 'geo':
      return Geolocation.fromJSON(attrs);
    case 'asset':
      return Asset.fromJSON(attrs);
    case 'date':
      return new Date(attrs.$date);
    case 'ref':
      return Reference.fromJSON(attrs);
    case 'unknown':
      return UnknownValue.fromJSON(attrs);
    case 'record':
      return Record.fromJSON(attrs.$record);
    default:
      return mapObject(attrs, (key, value) => fromJSON(value));
    }
  } else if (attrs.fromJSON) {
    return attrs.fromJSON();
  } else {
    return attrs;
  }
}

export function isLocalStorageValid() {
  /* global window: false */
  try {
    var testKey = '_skygear_test';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValueType(value) {
  return value instanceof Asset ||
    value instanceof Reference ||
    value instanceof Geolocation ||
    value instanceof Record ||
    value instanceof UnknownValue ||
    value instanceof Sequence;
}

export class EventHandle {
  constructor(emitter, name, listener) {
    this.emitter = emitter;
    this.name = name;
    this.listener = listener;
  }

  cancel() {
    this.emitter.off(this.name, this.listener);
  }
}

/**
 * Get user ID from function parameter.
 *
 * @param {Record | String} userOrUserID a user record or a user ID
 * @return {String} the ID of the user
 */
export function getUserIDFromParams(userOrUserID) {
  if (isRecord(userOrUserID)) {
    if (userOrUserID.recordType !== 'user') {
      throw new SkygearError(
        `Expect a user record, but get ${userOrUserID.recordType}`,
        ErrorCodes.InvalidArgument
      );
    }

    return userOrUserID.recordID;
  }

  const type = typeof userOrUserID;
  if (type === 'string') {
    return userOrUserID;
  }

  throw new SkygearError(
    `Unknown type "${type}" to represent a user`,
    ErrorCodes.InvalidArgument
  );
}

/**
 *
 * @param {Role | String} roleOrRoleName a role or a role name
 * @return {String} the name of the role
 */
export function getRoleNameFromParams(roleOrRoleName) {
  if (isRole(roleOrRoleName)) {
    return roleOrRoleName.name;
  }

  const type = typeof roleOrRoleName;
  if (type === 'string') {
    return roleOrRoleName;
  }

  throw new SkygearError(
    `Unknown type "${type}" to represent a role`,
    ErrorCodes.InvalidArgument
  );
}
