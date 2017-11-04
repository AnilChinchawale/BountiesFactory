import React, { Component } from 'react'
import './AppContainer.css'

import Web3 from 'web3';

const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io"));
const json = require('../../../contracts.json');
const networkId = json.networkId;
const StandardBounties = web3.eth.contract(json.interfaces.StandardBounties).at(json.standardBountiesAddress);


const IPFS = require('ipfs-mini');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https'});
const BN = require(`bn.js`);
const utf8 = require('utf8');

import logo from './images/logo.svg';
import FlatButton from 'material-ui/FlatButton';
import BountiesFacts from 'components/BountiesFacts/BountiesFacts';

import ContractList from 'components/ContractList/ContractList';

import Dialog from 'material-ui/Dialog';
import SvgArrow from 'material-ui/svg-icons/hardware/keyboard-arrow-right';



class AppContainer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      modalError: "",
      modalOpen: false,
      loadingInitial: true,
      accounts: [],
      contracts: [],
      bounties: [],
      total: 0,
      totalMe: 0,
      loading: true,
      myBountiesLoading: true,
      selectedStage: "Active",
      selectedMine: "ANY",
    }

    this.getInitialData = this.getInitialData.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.getBounty = this.getBounty.bind(this);
    this.handleChangeStage = this.handleChangeStage.bind(this);
    this.handleMineChange = this.handleMineChange.bind(this);
    this.handleChangeToMine = this.handleChangeToMine.bind(this);
  }
  componentDidMount() {

    window.addEventListener('load',this.getInitialData);

  }

  toUTF8(hex) {
  // Find termination
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

  handleOpen () {
    this.setState({modalOpen: true});
  }

  handleClose(){
    this.setState({modalOpen: false});
    this.getInitialData();
  }


  getInitialData(){
    if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
      // Use Mist/MetaMask's provider
      web3.setProvider(window.web3.currentProvider);
      if (networkId !== web3.version.network){
        console.log("network, ", web3.version.network, networkId);
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

        }
      }
      }.bind(this));
    }
    } else {
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
      /*

      this.setState({modalError: "You must use MetaMask if you would like to use the Bounties.network dapp", modalOpen: true});
      setInterval(function() {
        if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
          this.getInitialData();
        } else {
          console.log("window", window.web3);
        }
      }, 100);
      */
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
              issuer: succ[0],
              deadline: newDate.toUTCString(),
              value: value,
              paysTokens: succ[3],
              stage: stage,
              balance: balance,
              bountyData: result,
              symbol: "ETH"
            });
            if (bounties.length === total){
              this.setState({bounties: bounties, loading: false});
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
                    issuer: succ[0],
                    deadline: newDate.toUTCString(),
                    value: parseInt(newAmount, 10),
                    paysTokens: succ[3],
                    stage: stage,
                    owedAmount: parseInt(succ[5], 10),
                    balance: parseInt(balance, 10),
                    bountyData: result,
                    symbol: symbol
                  });
                  console.log("bounties", bounties);
                  if (bounties.length === total){
                    this.setState({bounties: bounties, loading: false});
                  }
                });
              });

            });

          }

        });

      });

    });

  }
  handleChangeStage(evt){
    evt.preventDefault();
    var selected = evt.target.value;
    console.log("selected", selected);
    this.setState({selectedStage: selected});
  }

  handleMineChange(evt){
    evt.preventDefault();
    var selected = evt.target.value;
    this.setState({selectedMine: selected});
  }
  handleChangeToMine(evt){
    evt.preventDefault();
    this.setState({selectedMine: "MINE"});
  }

  render() {
    var newList = [];
    var totalMe = 0;;
    var activeList = [];
    var activeMe = 0;
    var draftMe = 0;
    var deadMe = 0;
    for (var i = 0; i < this.state.bounties.length; i++){
      if (this.state.bounties[i].issuer === this.state.accounts[0]){
        newList.push(this.state.bounties[i]);
        totalMe++;
        if (this.state.bounties[i].stage === "Active"){
          activeMe++;
        }
        if (this.state.bounties[i].stage === "Draft"){
          draftMe++;
        }
        if (this.state.bounties[i].stage === "Dead"){
          deadMe++;
        }
      }
      if (this.state.bounties[i].stage === this.state.selectedStage || this.state.selectedStage === "ANY"){
        if (this.state.selectedMine === "ANY"){
          activeList.push(this.state.bounties[i]);
        } else if (this.state.selectedMine === "MINE" && this.state.bounties[i].issuer === this.state.accounts[0]){
          activeList.push(this.state.bounties[i]);
        } else if (this.state.selectedMine === "NOT MINE" && this.state.bounties[i].issuer !== this.state.accounts[0]){
          activeList.push(this.state.bounties[i]);
        }
      }
    }
    var recentList = [];
    for (var j = 0; j < 3 && j < this.state.bounties.length; j++){
        recentList.push(this.state.bounties[j]);
    }
    const modalActions = [
    <FlatButton
      label="Retry"
      primary={true}
      onClick={this.handleClose}
      style={{color: "#65C5AA"}}
    />
  ];

  activeList.sort(function(b1, b2){
    return (b1.bountyId - b2.bountyId);
  });
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
      <div id="colourBody" style={{minHeight: "100vh", position: "relative"}}>
        <div style={{overflow: "hidden"}}>
          <a href="/" style={{width: "276px", overflow: "hidden", display: "inline-block", float: "left", padding: "1.25em 0em"}}>
            <div style={{backgroundImage: `url(${logo})`, height: "3em", width: "14em", backgroundSize: "contain", backgroundRepeat: "no-repeat", display: "block", float: "left", marginLeft: "60px"}}>
            </div>
          </a>
          <BountiesFacts total={this.state.total}/>
          <span style={{backgroundSize: 'cover', backgroundRepeat: 'no-repeat', borderRadius: '50%', boxShadow: 'inset rgba(255, 255, 255, 0.6) 0 2px 2px, inset rgba(0, 0, 0, 0.3) 0 -2px 6px'}} />
          <FlatButton href="/newBounty/" style={{backgroundColor: "#65C5AA", border:"0px", color: "#152639", width: "150px", marginTop: '18px', float: "right", marginRight: "60px"}} > New Bounty </FlatButton>
        </div>
        <div style={{ display: "block", overflow: "hidden", width: "1100px", margin: "0 auto", paddingBottom: "120px"}}>

          <div style={{width: "245px", float: "left", display: "block", marginRight: "15px"}}>
            <h3 style={{fontFamily: "Open Sans", marginTop: "31px", marginBottom: "31px", textAlign: "center", color: "white", width: "100%"}}>My Profile</h3>
            <div style={{display: "block", width: "215px", backgroundColor: "rgba(10, 22, 40, 0.5)", overflow: "hidden", marginTop: "15px", padding: "15px", minHeight: "237px"}}>

            {this.state.accounts.length > 0 &&
              <div>
              <h5 style={{fontFamily: "Open Sans", marginTop: "15px", marginBottom: "15px", color: "white", width: "100%", fontWeight: "500", textAlign: "center", lineHeight: "24px"}}>You have posted  <b style={{color: "#65C5AA", fontSize: "24px"}}>{totalMe}</b> bounties</h5>
              <div style={{marginBottom: "15px", borderBottom: "1px solid #65C5AA", display: "block", overflow: "hidden"}}>

                <div style={{width: "33%", float: "left", display: "block"}}>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "15px", marginBottom: "0px", textAlign: "center", color: "white", width: "100%", fontWeight: "500", lineHeight: "24px", borderRight:"1px solid #65C5AA"}}><b style={{ fontSize: "24px"}}>{draftMe}</b></h5>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "0px", marginBottom: "15px", textAlign: "center", color: "rgb(255, 186, 20)", width: "100%", fontWeight: "500" }}>Draft</h5>

                </div>
                <div style={{width: "33%", float: "left", display: "block"}}>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "15px", marginBottom: "0px", textAlign: "center", color: "white", width: "100%", fontWeight: "500",  lineHeight: "24px", borderRight:"1px solid #65C5AA"}}><b style={{fontSize: "24px"}}>{activeMe}</b></h5>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "0px", marginBottom: "15px", textAlign: "center", color: "rgb(255, 222, 70)" , width: "100%", fontWeight: "500" }}>Active</h5>


                </div>
                <div style={{width: "33%", float: "left", display: "block"}}>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "15px", marginBottom: "0px", textAlign: "center", color: "white", width: "100%", fontWeight: "500", lineHeight: "24px"}}><b style={{ fontSize: "24px"}}>{deadMe}</b></h5>
                  <h5 style={{fontFamily: "Open Sans", marginTop: "0px", marginBottom: "15px", textAlign: "center", color: "#65C5AA", width: "100%", fontWeight: "500"}}>Dead</h5>

                </div>


              </div>

              <FlatButton
                label="My Profile"
                primary={true}
                labelPosition="before"
                href={"/user/" + this.state.accounts[0]}
                style={{color: "white", width: "100%", backgroundColor: "rgba(256, 256, 256, 0.05)"}}
                icon={<SvgArrow style={{color: "#65C5AA", fontSize: "44px"}}/>}
              />
              <FlatButton
                label="My Bounties"
                primary={true}
                labelPosition="before"
                onClick={this.handleChangeToMine}
                style={{color: "white", width: "100%", backgroundColor: "rgba(256, 256, 256, 0.05)", marginTop: "15px"}}
                icon={<SvgArrow style={{color: "#65C5AA", fontSize: "44px"}}/>}
              />
              </div>
          }
          {this.state.accounts.length === 0 &&
            <div>
            <h5 style={{fontFamily: "Open Sans", marginTop: "45px", marginBottom: "15px", color: "white", width: "100%", fontWeight: "700", textAlign: "center", fontSize: "18px"}}>You have no account!</h5>
            <h5 style={{fontFamily: "Open Sans", marginTop: "15px", marginBottom: "15px", color: "white", width: "100%", fontWeight: "300", textAlign: "center", fontSize: "14px"}}>{"This is likely because you're not using a web3 enabled browser. You can download the "}<a href="https://metamask.io" target="_blank" style={{color: "#65C5AA", fontWeight: "700"}}> Metamask </a>{" extension to begin posting bounties."}</h5>

</div>
          }

            </div>

          </div>
          <div style={{width: "630px", float: "left", display: "block"}}>
            <ContractList list={activeList} acc={this.state.accounts[0]} loading={this.state.loading} title={'Bounties'}/>
          </div>
          <div style={{width: "195px", float: "left", display: "block", marginLeft: "15px"}}>
            <h3 style={{fontFamily: "Open Sans", marginTop: "31px", marginBottom: "31px", textAlign: "center", color: "white", width: "100%"}}>Filter</h3>
            <div style={{display: "block", width: "100%", backgroundColor: "rgba(10, 22, 40, 0.5)", overflow: "hidden"}}>
              <select onChange={this.handleChangeStage} value={this.state.selectedStage} style={{fontSize: "16px",backgroundColor: "rgba(10, 22, 40, 0)", border: "0px",color: "white", width: "195px", height: "40px", display: "block", borderRadius: "0px", webkitAppearance: "none", 	background: "url(data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0Ljk1IDEwIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2ZmZjt9LmNscy0ye2ZpbGw6IzQ0NDt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmFycm93czwvdGl0bGU+PHJlY3QgY2xhc3M9ImNscy0xIiB3aWR0aD0iNC45NSIgaGVpZ2h0PSIxMCIvPjxwb2x5Z29uIGNsYXNzPSJjbHMtMiIgcG9pbnRzPSIxLjQxIDQuNjcgMi40OCAzLjE4IDMuNTQgNC42NyAxLjQxIDQuNjciLz48cG9seWdvbiBjbGFzcz0iY2xzLTIiIHBvaW50cz0iMy41NCA1LjMzIDIuNDggNi44MiAxLjQxIDUuMzMgMy41NCA1LjMzIi8+PC9zdmc+) no-repeat 100% 50%", padding: "0px 10px"}}>
                <option value="Draft">Draft Bounties</option>
                <option value="Active">Active Bounties</option>
                <option value="Dead">Dead Bounties</option>
                <option value="ANY">Any Stage</option>
              </select>
            </div>
            <div style={{display: "block", width: "100%", backgroundColor: "rgba(10, 22, 40, 0.5)", overflow: "hidden", marginTop: "15px"}}>
              <select onChange={this.handleMineChange} value={this.state.selectedMine} style={{fontSize: "16px",backgroundColor: "rgba(10, 22, 40, 0)" , border: "0px", color: "white", width: "195px", height: "40px", display: "block", borderRadius: "0px", webkitAppearance: "none", 	background: "url(data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0Ljk1IDEwIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2ZmZjt9LmNscy0ye2ZpbGw6IzQ0NDt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmFycm93czwvdGl0bGU+PHJlY3QgY2xhc3M9ImNscy0xIiB3aWR0aD0iNC45NSIgaGVpZ2h0PSIxMCIvPjxwb2x5Z29uIGNsYXNzPSJjbHMtMiIgcG9pbnRzPSIxLjQxIDQuNjcgMi40OCAzLjE4IDMuNTQgNC42NyAxLjQxIDQuNjciLz48cG9seWdvbiBjbGFzcz0iY2xzLTIiIHBvaW50cz0iMy41NCA1LjMzIDIuNDggNi44MiAxLjQxIDUuMzMgMy41NCA1LjMzIi8+PC9zdmc+) no-repeat 100% 50%", padding: "0px 10px"}}>
                <option value="ANY" selected="selected">{"Anyone's Bounties"}</option>
                <option value="MINE">My Bounties</option>
                <option value="NOT MINE">Not My Bounties</option>
              </select>
            </div>



          </div>
        </div>
        <p style={{textAlign: "center", fontSize: "10px", padding: "15px", color: "rgba(256,256,256,0.75)", width: "100vw", display: "block", bottom: "0", position: "absolute"}}>&copy; Bounties Network, a ConsenSys Formation <br/>
        This software provided without any guarantees. <b> Use at your own risk</b> while it is in public beta.</p>

      </div>

    </div>

    )
  }
}

export default AppContainer
