// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {EventEmitter, Injectable} from '@angular/core';
import {CONFIG} from '../../../index.config';

@Injectable()
export class ClusterService {
  onClusterChangeEvent = new EventEmitter<string>();

  /**
   * Internal key for empty selection. To differentiate empty string from nulls.
   */
  private readonly allNamespacesKey_ = '_all';
  /**
   * Regular expression for namespace validation.
   */
  private readonly clusterRegex = /^([A-Za-z0-9]([-A-Za-z0-9]*[A-Za-z0-9])?|_all)$/;
  /**
   * Holds the currently selected namespace.
   */
  private currentCluster_ = '';

  setCurrent(cluster: string) {
    this.currentCluster_ = cluster;
  }

  current(): string {
    return this.currentCluster_ || CONFIG.defaultCluster;
  }


  getDefaultCluster(): string {
    return CONFIG.defaultCluster;
  }

  isClusterValid(cluster: string): boolean {
    return this.clusterRegex.test(cluster);
  }

  isMultiCluster(cluster: string): boolean {
    return cluster === this.allNamespacesKey_;
  }

  areMultipleNamespacesSelected(): boolean {
    return this.currentCluster_ ? this.currentCluster_ === this.allNamespacesKey_ : true;
  }
}
