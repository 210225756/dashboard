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

import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSelect} from '@angular/material/select';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {ClusterList} from '@api/backendapi';
import {Subject} from 'rxjs';
import {startWith, switchMap, takeUntil} from 'rxjs/operators';

import {CONFIG} from '../../../index.config';
import {CLUSTER_STATE_PARAM, NAMESPACE_STATE_PARAM} from '../../params/params';
import {HistoryService} from '../../services/global/history';
import {NotificationSeverity, NotificationsService} from '../../services/global/notifications';
import {KdStateService} from '../../services/global/state';
import {EndpointManager, Resource} from '../../services/resource/endpoint';
import {ResourceService} from '../../services/resource/resource';

import {ClusterService} from '../../services/global/cluster';
import {ClusterChangeDialog} from './changedialog/dialog';

import { HttpClient } from "@angular/common/http";
import * as cluster from "cluster";
//import * as process from 'process';

@Component({
  selector: 'kd-cluster-selector',
  templateUrl: './template.html',
  styleUrls: ['style.scss'],
})
export class ClusterSelectorComponent implements OnInit, OnDestroy {
  private clusterUpdate_ = new Subject();
  private unsubscribe_ = new Subject();
  private readonly endpoint_ = EndpointManager.resource(Resource.cluster);

  clusters: string[] = [];
  selectClusterInput = '';
  selectedCluster: string;
  resourceClusterParam: string;

  @ViewChild(MatSelect, {static: true}) private readonly select_: MatSelect;
  @ViewChild('clusterInput', {static: true}) private readonly clusterInputEl_: ElementRef;

  constructor(
    private readonly router_: Router,
    private readonly clusterService_: ClusterService,
    private readonly cluster_: ResourceService<ClusterList>,
    private readonly dialog_: MatDialog,
    private readonly kdState_: KdStateService,
    private readonly notifications_: NotificationsService,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _historyService: HistoryService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this._activatedRoute.queryParams.pipe(takeUntil(this.unsubscribe_)).subscribe(params => {
      const cluster = params.cluster;
      if (!cluster) {
        this.setDefaultQueryParams_();
        return;
      }

      if (this.clusterService_.current() === cluster) {
        return;
      }

      this.clusterService_.setCurrent(cluster);
      this.clusterService_.onClusterChangeEvent.emit(cluster);
      this.selectedCluster = cluster;
    });

    this.resourceClusterParam = this._getCurrentResourceClusterParam();
    this.router_.events
      .filter(event => event instanceof NavigationEnd)
      .distinctUntilChanged()
      .subscribe(() => {
        this.resourceClusterParam = this._getCurrentResourceClusterParam();
        if (this.shouldShowClusterChangeDialog(this.clusterService_.current())) {
          this.handleClusterChangeDialog_();
        }
      });

    this.selectedCluster = this.clusterService_.current();
    this.select_.value = this.selectedCluster;
    this.loadClusters_();
  }

  ngOnDestroy(): void {
    this.unsubscribe_.next();
    this.unsubscribe_.complete();
  }

  selectCluster(): void {
    if (this.selectClusterInput.length > 0) {
      this.selectedCluster = this.selectClusterInput;
      this.select_.close();
      this.changeCluster_(this.selectedCluster);
    }
  }

  onClusterToggle(opened: boolean): void {
    if (opened) {
      this.clusterUpdate_.next();
      this.focusClusterInput_();
    } else {
      this.changeCluster_(this.selectedCluster);
    }
  }

  formatCluster(cluster: string): string {
    if (this.clusterService_.isMultiCluster(cluster)) {
      return 'All clusters';
    }

    return cluster;
  }

  /**
   * When state is loaded and clusters are fetched perform basic validation.
   */
  private onClusterLoaded_(): void {
    let newCluster = this.clusterService_.getDefaultCluster();
    const targetCluster = this.selectedCluster;

    if (
      targetCluster &&
      (this.clusters.indexOf(targetCluster) >= 0 ||
        this.clusterService_.isClusterValid(targetCluster))
    ) {
      newCluster = targetCluster;
    }

    if (newCluster !== this.selectedCluster) {
      this.changeCluster_(newCluster);
    }
  }

  private loadClusters_(): void {

    // PAAS_ADMIN_URL//get admin url from env vars
    let envPaasAdminUrl = process.env.PAAS_ADMIN_URL
    //alert(envPaasAdminUrl)
    //console.log('envPaasAdminUrl:' + envPaasAdminUrl);

    if (envPaasAdminUrl == undefined || envPaasAdminUrl.length === 0) {
      //inform error and return
      //envPaasAdminUrl = "124.223.105.113:8888"
      console.error("PAAS_ADMIN_URL should not be empty");
    }
    const paasAdminUrl = `http://${envPaasAdminUrl}/icbc/paas/api/cluster/getAllCluster`;
    console.log('paasAdminUrl ' + paasAdminUrl);

    (async () => {
      //get clusters from admin
      const promise = new Promise(function (resolve, reject) {
        const handler = function () {
          if (this.readyState !== 4) {
            return;
          }
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(this.statusText));
          }
        };
        const client = new XMLHttpRequest();
        client.open("GET", paasAdminUrl);
        client.onreadystatechange = handler;
        client.responseType = "json";
        client.setRequestHeader("Accept", "application/json");
        client.send();

      });

      let clusters: string[] =[];
      var thenedPromise = promise.then(function (clustersJson: string) {
        var clustersList: string[] = [];
        console.log('clustersJson');
        console.log(clustersJson);
        //get clusters list

        //.clusters = clustersArr.map(cluster => cluster.name);
        //console.log('this.clusters1' + this.clusters);
        for( var i = 0; i < clustersJson.length; i++){
          // @ts-ignore
          var cluster = clustersJson[i]["clusterId"];
          if (cluster.includes("V4")){
            //console.log(cluster)
            //push into clusters
            clustersList.push(cluster)
            //console.log(sl)
          }
        }
        clusters = clustersList
      }, function (error) {
        console.error('Get clusters failed: ',error);
      });

      await thenedPromise;
      this.clusters = clusters;
      this.onClusterLoaded_();

    })();
  }

  private handleClusterChangeDialog_(): void {
    this.dialog_
      .open(ClusterChangeDialog, {
        data: {
          cluster: this.selectedCluster,
          newCluster: this._getCurrentResourceClusterParam(),
        },
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.selectedCluster = this._getCurrentResourceClusterParam();
          this.router_.navigate([], {
            relativeTo: this._activatedRoute,
            queryParams: {[CLUSTER_STATE_PARAM]: this.selectedCluster, [NAMESPACE_STATE_PARAM]: 'default'},   //!!change namespace
            queryParamsHandling: 'merge',
          });
        } else {
          this._historyService.goToPreviousState('overview');
        }
      });
  }

  private changeCluster_(cluster: string): void {
    this.clearClusterInput_();

    if (this.resourceClusterParam) {
      // Go to overview of the new cluster as change was done from details view.
      this.router_.navigate(['overview'], {
        queryParams: {[CLUSTER_STATE_PARAM]: cluster, [NAMESPACE_STATE_PARAM]: 'default'},  //!!change namespace
        queryParamsHandling: 'merge',
      });
    } else {
      // Change only the cluster as currently not on details view.
      this.router_.navigate([], {
        relativeTo: this._activatedRoute,
        queryParams: {[CLUSTER_STATE_PARAM]: cluster, [NAMESPACE_STATE_PARAM]: 'default'},  //!!change namespace
        queryParamsHandling: 'merge',
      });
    }
  }

  private clearClusterInput_(): void {
    this.selectClusterInput = '';
  }

  private shouldShowClusterChangeDialog(targetCluster: string): boolean {
    return (
      !!this.resourceClusterParam &&
      this.resourceClusterParam !== targetCluster
    );
  }

  private _getCurrentResourceClusterParam(): string | undefined {
    return this._getCurrentRoute().snapshot.params.resourceCluster;
  }

  private _getCurrentRoute(): ActivatedRoute {
    let route = this._activatedRoute.root;
    while (route && route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  /**
   * Focuses cluster input field after clicking on cluster selector menu.
   */
  private focusClusterInput_(): void {
    // Wrap in a timeout to make sure that element is rendered before looking for it.
    setTimeout(() => {
      this.clusterInputEl_.nativeElement.focus();
    }, 150);
  }

  setDefaultQueryParams_() {
    this.router_.navigate([this._activatedRoute.snapshot.url], {
      queryParams: {[CLUSTER_STATE_PARAM]: 'cluster', [NAMESPACE_STATE_PARAM]: 'default'},
      queryParamsHandling: 'merge',
    });
  }
}
