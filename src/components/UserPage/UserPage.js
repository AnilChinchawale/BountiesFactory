import React, { Component } from 'react'
import './UserPage.css'


const json = require('../../../contracts.json');

const networkId = json.networkId;

import Web3 from 'web3';
const web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io"));

const UserCommentsContract = web3.eth.contract(json.interfaces.UserComments).at(json.UserCommentsAddress);
const StandardBounties = web3.eth.contract(json.interfaces.StandardBounties).at(json.standardBountiesAddress);


const IPFS = require('ipfs-mini');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https'});
const BN = require(`bn.js`);

const utf8 = require('utf8');

import logo from '../AppContainer/images/logo.svg';


import BountiesFacts from 'components/BountiesFacts/BountiesFacts';

import ActivateForm from 'components/ActivateForm/ActivateForm';
import ChangeDeadlineForm from 'components/ChangeDeadlineForm/ChangeDeadlineForm';
import TransferOwnershipForm from 'components/TransferOwnershipForm/TransferOwnershipForm';
import ExtendDeadlineForm from 'components/ExtendDeadlineForm/ExtendDeadlineForm';
import KillBountyForm from 'components/KillBountyForm/KillBountyForm';
import IncreasePayoutForm from 'components/IncreasePayoutForm/IncreasePayoutForm';
import SvgArrow from 'material-ui/svg-icons/hardware/keyboard-arrow-right';

import FlatButton from 'material-ui/FlatButton';
import Chip from 'material-ui/Chip';
import SvgBug from 'material-ui/svg-icons/action/bug-report';
import SvgCode from 'material-ui/svg-icons/action/code';
import SvgGraphic from 'material-ui/svg-icons/image/brush';
import SvgContent from 'material-ui/svg-icons/editor/format-indent-increase';
import SvgTranslations from 'material-ui/svg-icons/action/language';
import SvgSocial from 'material-ui/svg-icons/social/share';
import SvgQuestion from 'material-ui/svg-icons/action/question-answer';
import SvgSurvey from 'material-ui/svg-icons/editor/drag-handle';
import SvgEdit from 'material-ui/svg-icons/editor/mode-edit';

import Dialog from 'material-ui/Dialog';

import Avatar from 'material-ui/Avatar';

import Halogen from 'halogen';

const ipfsAPI = require('ipfs-api');




class UserPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      modalError: "",
      balance: 0,
      loadingInitial: true,
      accounts: [""],
      contracts: [],
      fulfillments: [],
      bounties: [],
      total: 0,
      totalMe: 0,
      loading: true,
      modalOpen: false,
      commentsAbout: [],
      userAddress: this.props.params.address,
      commentError: ""

    }
    this.ipfsApi = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: "https"});

    this.getInitialData = this.getInitialData.bind(this);

    this.handleComment = this.handleComment.bind(this);

    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
  }
  componentDidMount() {
  this.getInitialData();
  }

  toUTF8(hex) {
      var str = "";
      var i = 0, l = hex.length;
      if (hex.substring(0, 2) === '0x') {
          i = 2;
      }
      for (; i < l; i+=2) {
          var code = parseInt(hex.substr(i, 2), 16);
          if (code === 0)
              break;
          str += String.fromCharCode(code);
      }

      return utf8.decode(str);
  }
  getBountyFulfillments(){
    var fulfillments;
    for (var i = 0; i < this.state.bounties.length; i++){
      this.getFulfillmentsForBounty(i);
    }
  }
  getFulfillmentsForBounty(i){
    var index = i;
    var bountyId = this.state.bounties[index].bountyId;
    StandardBounties.getNumFulfillments(bountyId, (err, succ)=> {
      var total = parseInt(succ, 10);
      var fulfillments = [];
      if (total === 0){
        var bounties = this.state.bounties;
        bounties[index].fulfillments = [];
        this.setState({bounties: bounties});
      }
      for (var j = 0; j < total; j++){
        StandardBounties.getFulfillment(bountyId, j, (err, succ)=> {
          ipfs.catJSON(succ[2], (err, result)=> {
            fulfillments.push({
              accepted:succ[0],
              fulfiller:succ[1],
              data: result
            });
            if (fulfillments.length == total){
              var bounties = this.state.bounties;
              bounties[index].fulfillments = fulfillments;
              this.setState({bounties: bounties});
            }
          });
        });
      }
    });
  }


  getBountyComments(){
    var comments;
    for (var i = 0; i < this.state.bounties.length; i++){
    //  this.getNumFulf
    }
  }

  getBounty(bountyId, bounties, total){
    StandardBounties.getBounty(bountyId, (err, succ)=> {
      StandardBounties.getBountyData(bountyId, (err, data)=> {
        ipfs.catJSON(data, (err, result)=> {
          var stage;
          if (parseInt(succ[4], 10) === 0){
            stage = "Draft";
          } else if (parseInt(succ[4], 10) === 1){
            stage = "Active";
          } else {
            stage = "Dead";
          }
          var newDate = new Date(parseInt(succ[1], 10)*1000);

          if (!succ[3]){
            var value = web3.fromWei(parseInt(succ[2], 10), 'ether');
            var balance = web3.fromWei(parseInt(succ[5], 10), 'ether');
            bounties.push({
              bountyId: bountyId,
              mine: succ[0].toLowerCase() === this.state.userAddress.toLowerCase(),
              issuer: succ[0],
              deadline: newDate.toUTCString(),
              value: value,
              paysTokens: succ[3],
              stage: stage,
              balance: balance,
              bountyData: result,
              symbol: "ETH",
              fulfillments: []
            });
            if (bounties.length === total){
              this.setState({bounties: bounties, loading: false});
              this.getBountyFulfillments();
              this.getBountyComments();
            }
          } else {
            StandardBounties.getBountyToken(bountyId, (err, address)=> {
              var HumanStandardToken = web3.eth.contract(json.interfaces.HumanStandardToken).at(address);
              HumanStandardToken.symbol((err, symbol)=> {
                HumanStandardToken.decimals((err, dec)=> {

                  var decimals = parseInt(dec, 10);
                  var newAmount = succ[2];
                  var decimalToMult = new BN(10, 10);
                  var decimalUnits = new BN(decimals, 10);
                  decimalToMult = decimalToMult.pow(decimalUnits);
                  newAmount = newAmount.div(decimalToMult);

                  var balance = succ[5];
                  balance = balance.div(decimalToMult);

                  bounties.push({
                    bountyId: bountyId,
                    mine: succ[0].toLowerCase() === this.state.userAddress.toLowerCase(),
                    issuer: succ[0],
                    deadline: newDate.toUTCString(),
                    value: parseInt(newAmount, 10),
                    paysTokens: succ[3],
                    stage: stage,
                    balance: parseInt(balance, 10),
                    bountyData: result,
                    symbol: this.toUTF8(symbol),
                    fulfillments: []
                  });
                  if (bounties.length === total){
                    this.setState({bounties: bounties, loading: false});
                    this.getBountyFulfillments();
                    this.getBountyComments();
                  }
                });
              });

            });

          }

        });

      });

    });

  }

  getInitialData(){
    if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
      // Use Mist/MetaMask's provider
      web3.setProvider(window.web3.currentProvider);
      if (networkId !== web3.version.network){
        console.log("network", networkId, web3.version.network);
          this.setState({modalError: ("Please change your Ethereum network to the " + json.networkName), modalOpen: true});
      } else {

      web3.eth.getAccounts(function(err, accs){
        if (err){
          console.log ('error fetching accounts', err);
        } else {
          if (accs.length === 0){
            this.setState({modalError: "Please unlock your MetaMask Accounts", modalOpen: true});

          } else {


          var account = web3.eth.accounts[0];
          setInterval(function() {
            if (web3.eth.accounts[0] !== account) {
              account = web3.eth.accounts[0];
              window.location.reload();
            }
          }, 100);

          this.setState({accounts: accs});
          var bounties = [];

          StandardBounties.getNumBounties((err, succ)=> {
            var total = parseInt(succ, 10);
            this.setState({total: total});
            for (var i = 0; i < total; i++){
              this.getBounty(i, bounties, total);

            }
            if (total === 0){
              this.setState({loading: false});
            }

          });
          web3.eth.getBalance(this.state.userAddress, (err, succ)=> {

            var balance = parseFloat(web3.fromWei(parseInt(succ, 10), "ether")).toFixed(2);
            console.log("balance", balance);

            this.setState({balance: balance});
          });
          /*
          StandardBounties.getBounty(this.state.bountyId, (err, succ)=> {
            StandardBounties.getBountyData(this.state.bountyId, (err, data)=> {
              if (data){
                console.log("data", data);

                ipfs.catJSON(data, (err, result)=> {
                  var stage;
                  if (parseInt(succ[4], 10) === 0){
                    stage = "Draft";
                  } else if (parseInt(succ[4], 10) === 1){
                    stage = "Active";
                  } else {
                    stage = "Dead";
                  }
                  var newDate = new Date(parseInt(succ[1], 10)*1000);


                  if (!succ[3]){
                    var value = web3.fromWei(parseInt(succ[2], 10), 'ether');
                    var balance = web3.fromWei(parseInt(succ[6], 10), 'ether');
                    console.log("balance: ", value, balance);
                    this.setState({contract: {
                      issuer: succ[0],
                      deadline: newDate.toUTCString(),
                      value: value,
                      paysTokens: succ[3],
                      stage: stage,
                      owedAmount: parseInt(succ[5], 10),
                      balance: balance,
                      bountyData: result,
                      symbol: "ETH",
                      mine: (succ[0] === this.state.accounts[0])
                    }, loading: false});
                  } else {
                    StandardBounties.getBountyToken(this.state.bountyId, (err, address)=> {
                      var HumanStandardToken = web3.eth.contract(json.interfaces.HumanStandardToken).at(address);
                      HumanStandardToken.symbol((err, symbol)=> {
                        HumanStandardToken.decimals((err, dec)=> {

                          var decimals = parseInt(dec, 10);
                          var newAmount = succ[2];
                          var decimalToMult = new BN(10, 10);
                          var decimalUnits = new BN(decimals, 10);
                          decimalToMult = decimalToMult.pow(decimalUnits);
                          newAmount = newAmount.div(decimalToMult);

                          var balance = succ[6];
                          balance = balance.div(decimalToMult);


                          this.setState({contract: {
                            issuer: succ[0],
                            deadline: newDate.toUTCString(),
                            value: parseInt(newAmount, 10),
                            paysTokens: succ[3],
                            stage: stage,
                            owedAmount: parseInt(succ[5], 10),
                            balance: parseInt(balance, 10),
                            bountyData: result,
                            symbol: this.toUTF8(symbol),
                            mine: (succ[0] === this.state.accounts[0]),
                            decimals: decimals,
                            tokenContract: HumanStandardToken,
                          }, loading: false});

                        });
                      });

                    });

                  }

                });
              }



            });

          });

          StandardBounties.getNumFulfillments(this.state.bountyId, (err, succ)=> {
            var total = parseInt(succ, 10);
            console.log("total", total);
            var fulfillments = [];
            for (var j = 0; j < total; j++){
              StandardBounties.getFulfillment(this.state.bountyId, j, (err, succ)=> {
                ipfs.catJSON(succ[3], (err, result)=> {
                  fulfillments.push({
                    paid: succ[0],
                    accepted: succ[1],
                    fulfiller: succ[2],
                    data: result,
                  });
                  console.log("got fulfillment", fulfillments);

                  if (fulfillments.length === total){
                    this.setState({fulfillments: fulfillments});
                  }
                });
              });
            }
          });


          UserCommentsContract.numCommentsAboutUser(this.state.bountyId, (err, succ)=> {
            var total = parseInt(succ, 10);
            var comments = [];

            console.log("total comments: ", total);
            for (var i = 0; i < total; i++){
              UserCommentsContract.getCommentAboutBounty(this.state.bountyId, i, (err, succ)=> {
                var from = succ[1];
                var date = new Date(parseInt(succ[2], 10)*1000);
                ipfs.catJSON(succ[0], (err, result)=> {
                  comments.push({title: result.title, from: from, description: result.description, date: date.toUTCString()});
                  if (comments.length === total){
                    this.setState({commentsAbout: comments});
                  }
                });
              });
            }
          });
*/
/*
          UserCommentsContract.numCommentsAboutUser(this.state.bountyContract.address, (err, succ)=> {
            var total = parseInt(succ, 10);
            var comments = [];
            for (var i = 0; i < total; i++){
              UserCommentsContract.commentsAboutUser(this.state.bountyContract.address, i, (err, succ)=> {
                var from = succ[1];
                var to = succ[2];
                var date = new Date(parseInt(succ[3], 10)*1000)
                ipfs.catJSON(succ[0], (err, result)=> {
                  comments.push({title: result.title, description: result.description, from: from, to: to, date: date.toUTCString()});
                  if (comments.length === total){
                    this.setState({commentsAbout: comments});
                  }
                });
              });
            }
          });*/

        }
      }

        }.bind(this));
      }
    } else {
      this.setState({modalError: "You must use MetaMask if you would like to use the Bounties.network dapp", modalOpen: true});
      setInterval(function() {
        if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
          this.getInitialData();
        } else {
          console.log("window", window.web3);
        }
      }, 100);
    }

  }
  handleComment(evt){
    evt.preventDefault();

    var title = evt.target.comment_title.value;
    var description = evt.target.comment_description.value;

    if (title === "" || description === ""){
      this.setState({commentError: "All comment fields are required!"});
    } else {
      this.setState({commentError: ""});
      ipfs.addJSON({title: title, description: description}, (err, succ)=> {
        console.log("about to add", succ, 0x0, true, this.state.bountyId);
        UserCommentsContract.addComment(succ, 0x0, true, this.state.bountyId, {from: this.state.accounts[0]}, (cerr, succ)=> {

          window.location.reload();
        });
      })
    }

  }


handleOpen () {
  this.setState({modalOpen: true});
}

handleClose(){
  this.setState({modalOpen: false});
  this.getInitialData();
}

onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

  render() {
    const modalActions = [
    <FlatButton
      label="Retry"
      primary={true}
      onClick={this.handleClose}
    />
  ];
  var commentsArray = [];
  var comments;

  for (var i = 0; i < this.state.commentsAbout.length; i++){
    commentsArray.push(
      <div style={{display: "block", borderBottom: "0px solid #65C5AA", marginBottom: "30px", overflow: "hidden"}} key={"comment: "+i}>
        <div style={{backgroundColor: "rgba(10, 22, 40, 0.5)", display: "block", overflow: "hidden", padding: "15px"}}>
            <h5 style={{margin: "15px 0px"}}><b style={{color: "#FFDE46", fontSize: "16px"}}>{this.state.commentsAbout[i].title}</b></h5>
            <p style={{ fontSize: "12px", width: "100%", margin: "2.5px 0px", }}><b style={{color: "#FFDE46"}}>By: </b>
            <a style={{color: "#65C5AA"}} target={"_blank"} href={"https://etherscan.io/address/"+ this.state.commentsAbout[i].from}>{this.state.commentsAbout[i].from}</a></p>
            <p style={{ fontSize: "12px", width: "100%", margin: "2.5px 0px", }}><b style={{color: "#FFDE46"}}>On: </b>{this.state.commentsAbout[i].date}</p>
            <p style={{ fontSize: "12px", width: "100%", margin: "2.5px 0px", }}><b style={{color: "#FFDE46"}}>Comment: </b>{this.state.commentsAbout[i].description}</p>
        </div>
      </div>
    );
  }
  comments = (
    <div style={{paddingTop: "30px", display: "block"}}>
      <h3 style={{fontFamily: "Open Sans", marginTop: "30px", margin: "0 auto", marginBottom: "15px", textAlign: "center"}}>{this.state.commentsAbout.length} Comment{this.state.commentsAbout.length !== 1? "s" : ""}</h3>
      {commentsArray}
    </div>
  );

  var myBounties = [];
  var myFul = [];
  var numAccepted = 0;
  var myNumKilled = 0;
  var mine = false;
  var myNumAccepted = 0;
  var myIssued = 0;
  var mySubs = 0;
  var myContactInfo = [];
  var myCategories = [];
  for (i = 0; i  < this.state.bounties.length; i++){
    if (this.state.bounties[i].mine){
      mine = true;
      myIssued++;
      myBounties.push(this.state.bounties[i]);
      mySubs+= this.state.bounties[i].fulfillments.length;
      myContactInfo.push(this.state.bounties[i].bountyData.contact);

    }
    for (var j = 0; j < this.state.bounties[i].fulfillments.length; j++){
      console.log("ful", this.state.bounties[i].fulfillments[j].fulfiller);
      if (mine){
        if (this.state.bounties[i].fulfillments[j].accepted){
          myNumAccepted ++;
        }
        if (this.state.bounties[i].stage === "Dead"){
          myNumKilled++;
        }
      }
      if (this.state.bounties[i].fulfillments[j].fulfiller.toLowerCase() === this.state.userAddress.toLowerCase()){
        for (var k = 0; k < this.state.bounties[i].bountyData.categories.length; k++){
          if (myCategories.indexOf(this.state.bounties[i].bountyData.categories[k]) < 0){
            myCategories.push(this.state.bounties[i].bountyData.categories[k]);
          }
        }
        if (this.state.bounties[i].fulfillments[j].accepted){
          numAccepted ++;
        }
        myFul.push({
          accepted:this.state.bounties[i].fulfillments[j].accepted,
          data:this.state.bounties[i].fulfillments[j].data,
          bountyId:this.state.bounties[i].bountyId,
          value: this.state.bounties[i].value,
          symbol: this.state.bounties[i].symbol
        });
      }
    }
    mine = false;
  }
  console.log("my categories", myCategories);
  var categories = [];
  if (myCategories.length > 0){
    for (i = 0; i < myCategories.length; i++){
      var icon;
      if (myCategories[i] === "Bugs"){
        icon=(<SvgBug />);
      } else if (myCategories[i] === "Code"){
        icon=(<SvgCode />);
      } else if (myCategories[i] === "Graphic Design"){
        icon=(<SvgGraphic />);
      } else if (myCategories[i] === "Questions"){
        icon=(<SvgQuestion />);
      } else if (myCategories[i] === "Surveys"){
        icon=(<SvgSurvey />);
      } else if (myCategories[i] === "Social Media"){
        icon=(<SvgSocial />);
      } else if (myCategories[i] === "Content Creation"){
        icon=(<SvgContent />);
      } else if (myCategories[i] === "Translations"){
        icon=(<SvgTranslations />);
      }
      categories.push(
        <Chip style={{margin: "5px 5px 5px 0px", float: "left", border: "1px solid rgba(0, 126, 255, 0.24)", backgroundColor: "rgba(0, 126, 255, 0.08)", height: "30px"}}
              labelStyle={{color: "white", lineHeight: "28px"}}
              key={myCategories[i]}>
          <Avatar color="rgb(255, 222, 70)" icon={icon} style={{backgroundColor: "rgba(0, 126, 255, 0.24)", height: "28px", width: "28px"}}/>
          {myCategories[i]}
        </Chip>
      );
    }
  }
  var uniqueContactInfo = myContactInfo.filter(this.onlyUnique);
  var acceptanceRate = 0;
  if (myFul.length !== 0){
    acceptanceRate = (numAccepted*100 / myFul.length).toFixed(0);
  }
  var myAcceptanceRate = 0;
  if (mySubs !== 0){
    myAcceptanceRate = (myNumAccepted*100 / mySubs).toFixed(0);
  }
  console.log("contacts", uniqueContactInfo);
  var contactString = uniqueContactInfo.join(", ");
  console.log("my bounties & ful", myBounties, myFul);
  var bountiesList = [];
  for (i = 0; i < myBounties.length && i < 5; i++){
    var url = ("/bounty/" + myBounties[i].bountyId);
    bountiesList.push(
      <a key={"bountiesList"+i} style={{}} href={url}>
      <div  style={{backgroundColor: "rgba(10, 22, 40, 0.75)", borderLeft: "1px solid rgb(101, 197, 170)", padding: "10px", marginBottom: (i === (myBounties.length - 1) || i == 4)? "0px":"15px", marginTop: "0px", color: "white", overflow: "hidden"}} >
        <div style={{width: "390px", display: "block", float: "left", overflow: "hidden"}}>
        <h4 style={{margin: "0px", fontSize: "16px", fontWeight: "700"}}>{myBounties[i].bountyData.title}</h4>
        <p style={{ fontSize: "12px", width: "100%", margin: "2.5px 0px", fontWeight: "700"}}>{myBounties[i].fulfillments.length}<b style={{color: "#FFDE46", fontWeight: "200"}}> total submissions</b></p>
        </div>
        <SvgArrow style={{color: "#65C5AA", fontSize: "44px", marginTop: "10px", color: "#65C5AA", textAlign: "right", display: "block"}}/>
      </div>
      </a>
    );
  }
  var fulfillmentsList = [];
  for (i = 0; i < myFul.length && i < 5; i++){
    var url = ("/bounty/" + myFul[i].bountyId);

    fulfillmentsList.push(
      <a key={"fulList"+i} style={{}} href={url}>
      <div style={{backgroundColor: "rgba(10, 22, 40, 0.75)", borderLeft: "1px solid rgb(101, 197, 170)", padding: "10px", marginBottom: (i === (myBounties.length - 1) || i == 4)? "0px":"15px", marginTop: "0px", color: "white", overflow: "hidden"}} >
        <div style={{width: "390px", display: "block", float: "left", overflow: "hidden"}}>
        <h4 style={{margin: "0px", fontSize: "16px", fontWeight: "700"}}>{myBounties[i].bountyData.title}</h4>
        <p style={{ fontSize: "12px", width: "100%", margin: "2.5px 0px", fontWeight: "700"}}><b style={{color: "#FFDE46", fontWeight: "200"}}>Reward: </b>{myFul[i].value + " " + myFul[i].symbol} | <b style={{color: "#FFDE46", fontWeight: "200"}}>{myFul[i].accepted? "Accepted" : "Not Accepted"}</b></p>

        </div>
        <SvgArrow style={{color: "#65C5AA", fontSize: "44px", marginTop: "10px", color: "#65C5AA", textAlign: "right", display: "block"}}/>

      </div>
      </a>
    );
  }
  var bountiesUI = (
    <div>

      <h3 style={{margin: "0px", width: "100%", fontSize: "18px", textAlign: "center"}}>Bounties Posted</h3>
      <div style={{paddingBottom: "15px", borderBottom: "1px solid rgb(101, 197, 170)", display: "inline-block", width: "442px", marginBottom: "12px"}}>
        <div style={{width: "33%", display: "inline-block", float: "left"}}>
          <h3 style={{textAlign: "center", fontSize: "48px", borderRight: "1px solid rgb(101, 197, 170)", margin: "15px 0px"}}> {myBounties.length} </h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Bounties</p>
        </div>
        <div style={{width: "33%", display: "inline-block", float: "left"}}>
          <h3 style={{textAlign: "center", fontSize: "48px", borderRight: "1px solid rgb(101, 197, 170)", margin: "15px 0px"}}>{myNumAccepted}</h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Accepted</p>
        </div>
        <div style={{width: "33%", display: "inline-block", float: "left"}}>
        <h3 style={{textAlign: "center", fontSize: "48px", margin: "15px 0px"}}>{myAcceptanceRate}<b style={{fontSize: "18px"}}>%</b></h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Acceptance Rate</p>
        </div>
      </div>
      {bountiesList}
    </div>
  );

  var fulUI = (
    <div>
      <h3 style={{margin: "0px", width: "100%", fontSize: "18px", textAlign: "center"}}>Bounty Submissions</h3>
      <div style={{paddingBottom: "15px", borderBottom: "1px solid rgb(101, 197, 170)", display: "inline-block", width: "442px",  marginBottom: "12px"}}>
        <div style={{width: "33%", display: "inline-block", float: "left"}}>
          <h3 style={{textAlign: "center", fontSize: "48px", borderRight: "1px solid rgb(101, 197, 170)", margin: "15px 0px"}}>{myFul.length}</h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Submissions</p>
        </div>

        <div style={{width: "33%", display: "inline-block", float: "left"}}>
          <h3 style={{textAlign: "center", fontSize: "48px", borderRight: "1px solid rgb(101, 197, 170)", margin: "15px 0px"}}>{numAccepted}</h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Accepted</p>
        </div>
        <div style={{width: "33%", display: "inline-block", float: "left"}}>
          <h3 style={{textAlign: "center", fontSize: "48px", margin: "15px 0px"}}>{acceptanceRate}<b style={{fontSize: "18px"}}>%</b></h3>
          <p style={{fontSize: "10px", textAlign: "center", color: "rgb(255, 222, 70)"}}>Acceptance Rate</p>
        </div>
      </div>
      {fulfillmentsList}
    </div>
  );

  console.log("this", this.state.bounties);

    return (
      <div>
      <Dialog
         title=""
         actions={modalActions}
         modal={true}
         open={this.state.modalOpen}
       >
         {this.state.modalError}
       </Dialog>
        <div id="colourBody" style={{minHeight: "100vh", position: "relative", overflow: "hidden"}}>
          <div style={{overflow: "hidden"}}>
            <a href="/" style={{width: "276px", overflow: "hidden", display: "inline-block", float: "left", padding: "1.25em 0em"}}>
              <div style={{backgroundImage: `url(${logo})`, width: "14em", backgroundSize: "contain", backgroundRepeat: "no-repeat",  height: "3em", float: "left", marginLeft: "60px", display: "block"}}>
              </div>
            </a>
          <BountiesFacts total={this.state.total}/>
          <span style={{backgroundSize: 'cover', backgroundRepeat: 'no-repeat', borderRadius: '50%', boxShadow: 'inset rgba(255, 255, 255, 0.6) 0 2px 2px, inset rgba(0, 0, 0, 0.3) 0 -2px 6px'}} />

          <FlatButton href="/newBounty/" style={{backgroundColor: "#65C5AA", border:"0px", color: "#152639", width: "150px", marginTop: '18px', float: "right", marginRight: "60px"}} > New Bounty </FlatButton>

          </div>
          <div style={{ display: "block", overflow: "hidden", width: "1050px", margin: "0 auto", paddingBottom: "160px"}}>
          <div style={{float: "left", margin: "0 15px 15px 15px", width: "960px", display: "inline-block", backgroundColor: "rgba(10, 22, 40, 0.5)", padding: "30px"}}>
              <div style={{float: "left", display: "inline-block", width: "200px"}}>
                <div style={{backgroundColor: "rgba(10, 22, 40, 0.5)", display: "block", overflow: "hidden", padding: "15px"}}>
                  <h5 style={{ fontSize: "12px", width: "100%", textAlign: "center", marginTop: "7.5px", marginBottom: "7.5px"}}>Balance:</h5>
                  <h1 style={{textAlign: "center", marginTop: "7.5px", marginBottom: "7.5px"}}>{this.state.balance}</h1>
                  <h5 style={{ fontSize: "12px", width: "100%", textAlign: "center", marginTop: "7.5px", marginBottom: "7.5px"}}>ETH</h5>
                </div>
              </div>
              <div style={{float: "left", display: "inline-block", paddingLeft: "30px", width: "730px"}}>
              <p style={{ fontSize: "14px", width: "100%", margin: "2.5px 0px"}}><b style={{color: "#FFDE46", fontWeight: "200"}}>User Address:</b></p>
                <h3 style={{margin: "0px", width: "100%", display: "inline", fontWeight: "200", marginTop: "30px"}}>
                  <a style={{color: "#65C5AA"}} target={"_blank"} href={"https://etherscan.io/address/"+ this.state.userAddress}>{this.state.userAddress}</a>
                </h3>
                <p style={{ fontSize: "14px", width: "100%", margin: "2.5px 0px"}}><b style={{color: "#FFDE46", fontWeight: "200"}}>Contact user:</b> { contactString}</p>
                <p style={{ fontSize: "14px", width: "100%", margin: "2.5px 0px"}}><b style={{color: "#FFDE46", fontWeight: "200"}}>Skills:</b></p>

                {categories}
              </div>
          </div>
            <div style={{float: "left", margin: "0 15px 15px 15px", width: "442px", display: "inline-block", backgroundColor: "rgba(10, 22, 40, 0.5)", padding: "30px"}}>
              {bountiesUI}

            </div>
            <div style={{float: "left", margin: "0 15px 15px 0px", width: "442px", display: "inline-block", backgroundColor: "rgba(10, 22, 40, 0.5)", padding: "30px"}}>
              {fulUI}

            </div>
              <div style={{float: "left", display: "block", margin: "0 15px", width: "1000px"}}>
              {
                this.state.userAddress.toLowerCase() !== this.state.accounts[0].toLowerCase() && !this.state.loading
                &&
                <form className='Contribute' onSubmit={this.handleComment} style={{width: "960px", display: "inline-block", backgroundColor: "rgba(10, 22, 40, 0.5)", padding: "30px"}}>
                  <h4 style={{fontFamily: "Open Sans", marginTop: "0", margin: "0 auto", marginBottom: "15px", textAlign: "center"}}>Comment on User</h4>
                  <label htmlFor='comment_title' style={{fontSize: "12px", display: "block"}}>Title</label>
                  <input id='comment_title' className='SendAmount' type='text' style={{width: "940px", border: "0px", display: "block", padding: "8px", fontSize: "1em"}}/>
                  <label htmlFor='comment_description' style={{fontSize: "12px", display: "block", marginTop: "15px"}}>Description</label>
                  <textarea id='comment_description' cols="60" rows="3" className='ContractCode' type='text' style={{width: "940px", border: "0px", display: "block", padding: "8px", fontSize: "1em"}}></textarea>
                  {this.state.commentError &&
                    <p style={{fontSize: "12px", color: "#fa4c04", marginTop: "10px", textAlign: "center"}}>{this.state.commentError}</p>}
                  <button type='submit'  className='AddBtn' style={{backgroundColor: "rgba(255, 255, 255, 0.18)", border:"0px", color: "white",  display: "block", padding: "16px", margin: "0 auto", marginTop: "15px", fontSize: "1em", width: "200px"}}>Comment</button>
                </form>
              }
              {comments}
            </div>
          </div>
          <p style={{textAlign: "center", fontSize: "10px", padding: "15px", color: "rgba(256,256,256,0.75)", bottom: "0", position: "absolute", width: "100vw"}}>&copy; Bounties Network, a ConsenSys Formation <br/>
          This software provided without any guarantees. <b> Use at your own risk</b> while it is in public beta.</p>
        </div>
      </div>
    )
  }
}

export default UserPage
