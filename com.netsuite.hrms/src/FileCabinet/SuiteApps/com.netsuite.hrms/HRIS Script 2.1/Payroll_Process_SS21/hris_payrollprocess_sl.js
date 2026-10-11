/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget','N/query','N/redirect'], 
    function(log, search, record, runtime, serverWidget,query,redirect) {

        function onRequest(context) {

            var request = context.request;
            var response = context.response;
			var parameters = context.request.parameters;
            var curUser = runtime.getCurrentUser();
            var curRole = curUser.role;

            // Add your logic for role and user validation here
			/*if ((curRole === '3' && (curUser.id === '329740' || curUser.id === '329739' || curUser.id === '329738')) ||
				(curRole === '1104' || curRole === '1105' || curUser.id === '466163')) {
				
			} else {
				throw 'You do not have privilege to access this page!';
			}*/

            var b_Flag = request.parameters.custscript_flag_postmethod;
            log.debug('b_Flag', b_Flag);

            if (!_logValidation(b_Flag)) {
                b_Flag = false;
            }

            log.debug('b_Flag', b_Flag);
            log.debug('Request Method', request.method);

            if (b_Flag == false) {
                if (request.method == 'GET') {
					//***** GET Method  *****/
                    var form = serverWidget.createForm({
                        title: 'Pay Process'
                    });

					var subsidiary=form.addField({
						id:'custscript_subsidiary',
						type: serverWidget.FieldType.SELECT,
						label:'Subsidiary',
						source:"subsidiary"
				});
					  subsidiary.isMandatory = true;
					var paygrpName = form.addField({
                        id: 'custscript_paygroup',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Pay group'
                    });

                    paygrpName.isMandatory = true;

                    // Add your logic to populate pay group options here
					var sqlPaygrp = "select id,name from customrecord_hris_process_groupmaster where isinactive='F' ";
					var paygrpQueryResult =  query.runSuiteQL({ query: sqlPaygrp });
					var paygrpResult = paygrpQueryResult.asMappedResults();
					if (paygrpResult.length > 0) {
						paygrpName.addSelectOption({
							value: '',
							text: ''
						});
						for (var loop =0; loop < paygrpResult.length; loop++) {
							var paygrprow = paygrpResult[loop];
							var internalId  = paygrprow.id;
							var name = paygrprow.name;
							paygrpName.addSelectOption({
								value: internalId,
								text: name,
								isSelected: false
							});
							
						}
					}

                    form.addSubmitButton({
                        label: 'Get Data'
                    });

                    response.writePage(form);

                } else 
				if (request.method == 'POST') {
					//***** POST Method  *****/
					var param = new Array();
					var scriptObj = context.request.parameters;
                    
					var i_Counter = request.parameters.custscript_counter_delete; 
					//Paygroup
					var payGroup= scriptObj.custscript_paygroup;
					var Subsidiary=  scriptObj.custscript_subsidiary;
					log.debug('POST payGroup', payGroup);
					//Get Paygroup Frequency sequence No
					var	PayfreqSeqNo = getPayfrequency(payGroup);
					log.debug('POST PayfreqSeqNo', PayfreqSeqNo);

					//Delete Pre Pay Process Record
					var a_Filter = [];
					var sqlPrepayprocess="";
					sqlPrepayprocess = "select * from customrecord_hris_pre_pay_process_record ";
					if(_logValidation(payGroup)) {
						sqlPrepayprocess += " where custrecord_hris_pre_pay_pr_pay_group = " + payGroup +"";
					}
					if(_logValidation(Subsidiary)) {
						sqlPrepayprocess += " and custrecord_hris_pre_pay_pr_subsidiary = " + Subsidiary;
					}
					var PrepayprocessResult =  query.runSuiteQL({ query: sqlPrepayprocess });
					var PrepayprocessRes = PrepayprocessResult.asMappedResults();
					if (PrepayprocessRes.length > 0) {
						if (PrepayprocessRes.length > 240) {
							for (var loop =0; loop < 240; loop++) {
								var Prepayprocessrow = PrepayprocessRes[loop];
								var i_PayGroupId = Prepayprocessrow.id;
								record.delete({
									type: 'customrecord_hris_pre_pay_process_record',
									id: i_PayGroupId
								});
								var usageRemained = runtime.getCurrentScript().getRemainingUsage();
								log.debug('usage_Remained', usageRemained);
							}
	
							b_Flag = true;
							param['custscript_counter_delete'] = 2;
							param['custscript_pay_group'] = payGroup;
							param['custscript_flag_postmethod'] = b_Flag;
                            param['custscript_hris_subsidiary']=Subsidiary;
							/* redirect.toSuitelet({
								scriptId: 'customscript_hris_payrollprocesssec_sl',
								deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
								parameters: param

							}); */
                            redirect.toSuitelet({
								scriptId: 'customscript_hris_payrollprocess_sl',
								deploymentId: 'customdeploy_hris_payrollprocess_sl',
                                isExternal: false,
								parameters: param
                                
							});
	
						}
						else 
						{
							for (var loop =0; loop < PrepayprocessRes.length; loop++) {
								var Prepayprocessrow = PrepayprocessRes[loop];
								var i_PayGroupId = Prepayprocessrow.id;
								record.delete({
									type: 'customrecord_hris_pre_pay_process_record',
									id: i_PayGroupId
								});
								var usageRemained = runtime.getCurrentScript().getRemainingUsage();
								log.debug('usage_Remained', usageRemained);
							}
							//Get Wage Period
							var wagedetails = getWagePeriod(payGroup) ;
							//log.debug("wagedetails",wagedetails);
							var wageMonth = "";
							var wageMonthTxt= "";
							var Year ="";
							var period = "";
							if (wagedetails.length > 0) {
								for (var loop =0; loop < wagedetails.length; loop++) {
									var wagedet = wagedetails[loop];
									//log.debug("wagedetails",wagedetails);
									wageMonth = wagedet.wagemonth;
									log.debug("wageMonth",wageMonth);
									wageMonthTxt= wagedet.wagemonthname; 	
									Year = wagedet.wageyear;
									period = wagedet.wageenddate;
									
								}
							}
							log.debug("wagedetails",wageMonth +"#"+ wageMonthTxt +"#"+ Year +"#"+period);
							var Emp_count = getEmployee(payGroup, period,Subsidiary);
							log.debug('GET', 'Emp_count' + Emp_count);
							//form.setValue('custscriptapm_wageperiod', wageMonth, false, false);
							param['custscript_paygroup'] = payGroup; // request.parameters.custscriptamp_paygroup;
							param['custscript_wagemonth'] = wageMonth; // request.parameters.custscriptapm_wageperiod;
							param['custscript_wagemonthtxt'] = wageMonthTxt;
							param['custscript_emp_count'] = Emp_count;
							param['custscript_emp_year'] = Year;
							param['custscript_emp_period'] = period;
							param['custscript_payfreq_seq'] = PayfreqSeqNo;
							param['custscript_hris_subsidiary']=Subsidiary;
							redirect.toSuitelet({
								scriptId: 'customscript_hris_payrollprocesssec_sl',
								deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
								parameters: param
							});
						}
					} else {
						//Get Wage Period
						var wagedetails = getWagePeriod(payGroup) ;
						//log.debug("wagedetails",wagedetails);
						var wageMonth = "";
						var wageMonthTxt= "";
						var Year ="";
						var period = "";
						if (wagedetails.length > 0) {
							for (var loop =0; loop < wagedetails.length; loop++) {
								var wagedet = wagedetails[loop];
								//log.debug("wagedetails",wagedetails);
								wageMonth = wagedet.wagemonth;
								log.debug("wageMonth",wageMonth);
								wageMonthTxt= wagedet.wagemonthname; 	
								Year = wagedet.wageyear;
								period = wagedet.wageenddate;
								
							}
						}
						log.debug("wagedetails",wageMonth +"#"+ wageMonthTxt +"#"+ Year +"#"+period);
						var Emp_count = getEmployee(payGroup, period,Subsidiary);
						log.debug('GET', 'Emp_count' + Emp_count);
						//form.setValue('custscriptapm_wageperiod', wageMonth, false, false);
						param['custscript_paygroup'] = payGroup; // request.parameters.custscriptamp_paygroup;
						param['custscript_wagemonth'] = wageMonth; // request.parameters.custscriptapm_wageperiod;
						param['custscript_wagemonthtxt'] = wageMonthTxt;
						param['custscript_emp_count'] = Emp_count;
						param['custscript_emp_year'] = Year;
						param['custscript_emp_period'] = period;
						param['custscript_payfreq_seq'] = PayfreqSeqNo;
						param['custscript_hris_subsidiary']=Subsidiary;
						redirect.toSuitelet({
							scriptId: 'customscript_hris_payrollprocesssec_sl',
							deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
							parameters: param
						});
					}
					


                }
            } else if (b_Flag == true) {
                log.debug('Request Method', ' ' + context.request.method);
				var param = new Array();
				/* 	var scriptObj = context.request.parameters;
                    
					var i_Counter = request.parameters.custscript_counter_delete; 
					//Paygroup
					var payGroup= scriptObj.custscript_paygroup;
					
					log.debug('POST payGroup', payGroup); */

		
                // Retrieve parameters from the request
                var payGroup = context.request.parameters.custscript_pay_group;
                log.debug('payGroup ', payGroup);

                var i_Counter = context.request.parameters.custscript_counter_delete;
                log.debug('i_Counter ', i_Counter);

				var subsidiary =context.request.parameters.custscript_hris_subsidiary;
				log.audit('subsidiary',subsidiary);

				var sqlPrepayprocess="";
				sqlPrepayprocess = "select * from customrecord_hris_pre_pay_process_record ";
				if(_logValidation(payGroup)) {
					sqlPrepayprocess += " where custrecord_hris_pre_pay_pr_pay_group = " + payGroup;
				}
				if(_logValidation(Subsidiary)) {
					sqlPrepayprocess += " and custrecord_hris_pre_pay_pr_subsidiary = " + Subsidiary;
				}
				log.audit('SqlPrepayprocess',sqlPrepayprocess);
				var PrepayprocessResult =  query.runSuiteQL({ query: sqlPrepayprocess });
				var PrepayprocessRes = PrepayprocessResult.asMappedResults();
				if (PrepayprocessRes.length > 0) {
					if (PrepayprocessRes.length > 240) {
						for (var loop =0; loop < 240; loop++) {
							var Prepayprocessrow = PrepayprocessRes[loop];
							var i_PayGroupId = Prepayprocessrow.id;
							log.debug('Paygroup id ',i_PayGroupId);
							record.delete({
								type: 'customrecord_hris_pre_pay_process_record',
								id: i_PayGroupId
							});
							var usageRemained = runtime.getCurrentScript().getRemainingUsage();
							log.debug('usage_Remained', usageRemained);
						}

						i_Counter++;

                        if (i_Counter < 5) {
                            var param = {
                                custscript_counter_delete: i_Counter,
                                custscript_pay_group: payGroup,
                                custscript_flag_postmethod: b_Flag,
								custscript_hris_subsidiary:Subsidiary
                            };
					/* 	redirect.toSuitelet({
							scriptId: 'customscript_hris_payrollprocesssec_sl',
							deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
							parameters: param
						}); */

                        redirect.toSuitelet({
                            scriptId: 'customscript_hris_payprocess_sl',
                            deploymentId: 'customdeploy_hris_payprocess_sl' + i_Counter,
                            isExternal: false,
                            parameters: param
                        });
					}
					else {
						// Employee Count
						// Wage Period
						
						var wagedetails = getWagePeriod(payGroup)
						
						var wageMonth = "";
						var wageMonthTxt= "";
						var Year ="";
						var period = "";
						if (wagedetails.length > 0) {
							for (var loop =0; loop < wagedetails.length; loop++) {
								var wagedet = wagedetails[loop];
								//log.debug("wagedetails",wagedetails);
								wageMonth = wagedet.wagemonth;
								log.debug("wageMonth",wageMonth);
								wageMonthTxt= wagedet.wagemonthname; 	
								Year = wagedet.wageyear;
								period = wagedet.wageenddate;
								
							}
						}
						log.debug("wagedetails",wageMonth +"#"+ wageMonthTxt +"#"+ Year +"#"+period);
						var Emp_count = getEmployee(payGroup, period,Subsidiary);
						log.debug('GET', 'Emp_count' + Emp_count);
						//form.setValue('custscriptapm_wageperiod', wageMonth, false, false);
						param['custscript_paygroup'] = payGroup; // request.parameters.custscriptamp_paygroup;
						param['custscript_wagemonth'] = wageMonth; // request.parameters.custscriptapm_wageperiod;
						param['custscript_wagemonthtxt'] = wageMonthTxt;
						param['custscript_emp_count'] = Emp_count;
						param['custscript_emp_year'] = Year;
						param['custscript_emp_period'] = period;
						param['custscript_payfreq_seq'] = PayfreqSeqNo;
						param['custscript_hris_subsidiary']=Subsidiary;

						redirect.toSuitelet({
							scriptId: 'customscript_hris_payrollprocesssec_sl',
							deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
							parameters: param
						});
					}		
					}
					else 
						{
							for (var loop =0; loop < PrepayprocessRes.length; loop++) {
								var Prepayprocessrow = PrepayprocessRes[loop];
								var i_PayGroupId = Prepayprocessrow.id;
								record.delete({
									type: 'customrecord_hris_pre_pay_process_record',
									id: i_PayGroupId
								});
								var usageRemained = runtime.getCurrentScript().getRemainingUsage();
								log.debug('usage_Remained', usageRemained);
							}
							//Get Wage Period
							var wagedetails = getWagePeriod(payGroup) ;
							//log.debug("wagedetails",wagedetails);
							var wageMonth = "";
							var wageMonthTxt= "";
							var Year ="";
							var period = "";
							if (wagedetails.length > 0) {
								for (var loop =0; loop < wagedetails.length; loop++) {
									var wagedet = wagedetails[loop];
									//log.debug("wagedetails",wagedetails);
									wageMonth = wagedet.wagemonth;
									log.debug("wageMonth",wageMonth);
									wageMonthTxt= wagedet.wagemonthname; 	
									Year = wagedet.wageyear;
									period = wagedet.wageenddate;
									
								}
							}
							log.debug("wagedetails",wageMonth +"#"+ wageMonthTxt +"#"+ Year +"#"+period);
							var Emp_count = getEmployee(payGroup, period,Subsidiary);
							log.debug('GET', 'Emp_count' + Emp_count);
							//form.setValue('custscriptapm_wageperiod', wageMonth, false, false);
							param['custscript_paygroup'] = payGroup; // request.parameters.custscriptamp_paygroup;
							param['custscript_wagemonth'] = wageMonth; // request.parameters.custscriptapm_wageperiod;
							param['custscript_wagemonthtxt'] = wageMonthTxt;
							param['custscript_emp_count'] = Emp_count;
							param['custscript_emp_year'] = Year;
							param['custscript_emp_period'] = period;
							param['custscript_payfreq_seq'] = PayfreqSeqNo;
							param['custscript_hris_subsidiary']=Subsidiary;
							redirect.toSuitelet({
								scriptId: 'customscript_hris_payrollprocesssec_sl',
								deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
								parameters: param
							});
						}

            }
			else{

					//Get Wage Period
					var wagedetails = getWagePeriod(payGroup) ;
					//log.debug("wagedetails",wagedetails);
					var wageMonth = "";
					var wageMonthTxt= "";
					var Year ="";
					var period = "";
					if (wagedetails.length > 0) {
						for (var loop =0; loop < wagedetails.length; loop++) {
							var wagedet = wagedetails[loop];
							//log.debug("wagedetails",wagedetails);
							wageMonth = wagedet.wagemonth;
							log.debug("wageMonth",wageMonth);
							wageMonthTxt= wagedet.wagemonthname; 	
							Year = wagedet.wageyear;
							period = wagedet.wageenddate;
							
						}
					}
					log.debug("wagedetails",wageMonth +"#"+ wageMonthTxt +"#"+ Year +"#"+period);
					var Emp_count = getEmployee(payGroup, period,Subsidiary);
					log.debug('GET', 'Emp_count' + Emp_count);
					//form.setValue('custscriptapm_wageperiod', wageMonth, false, false);
					param['custscript_paygroup'] = payGroup; // request.parameters.custscriptamp_paygroup;
					param['custscript_wagemonth'] = wageMonth; // request.parameters.custscriptapm_wageperiod;
					param['custscript_wagemonthtxt'] = wageMonthTxt;
					param['custscript_emp_count'] = Emp_count;
					param['custscript_emp_year'] = Year;
					param['custscript_emp_period'] = period;
					param['custscript_payfreq_seq'] = PayfreqSeqNo;
					param['custscript_hris_subsidiary']=Subsidiary;
					redirect.toSuitelet({
						scriptId: 'customscript_hris_payrollprocesssec_sl',
						deploymentId: 'customdeploy_hris_payrollprocesssec_sl',
						parameters: param
					});
			}

        }
	}
        function getWagePeriod(paygrpName) {
            
			var sqlwage = "select b.name as wagemonthname,A.custrecord_hris_month as wagemonth, c.name as  wageyear , A.custrecord_hris_year as wageyear1, \
				A.custrecord_hris_end_date as wageenddate from customrecord_hris_wage_period_details A \
				inner join customlist_hris_month_list b on b.id = a.custrecord_hris_month  inner join customlist_hris_year_master c on a.custrecord_hris_year = c.id  \
				where A.isinactive ='F' and A.custrecord_hris_pay_group=" +paygrpName;
			log.debug("sqlwage",sqlwage);
			var queryRes =  query.runSuiteQL({ query: sqlwage });
			wageResult = queryRes.asMappedResults();
			
			log.debug("wageResult",wageResult);
			return wageResult;
        }

        function getEmployee(paygrpName, period,subsidiary) {
			log.debug("getEmployee", paygrpName + " - " + period);
            var Count=0;
			var sqlemp = "select a.custrecord_hris_empchange_employee_nam,max(custrecord_hris_empchange_increment_eff),a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join \
					from customrecord_hris_employee_compen_change a \
					inner join employee b on b.id = a.custrecord_hris_empchange_employee_nam \
					WHERE custrecord_hris_empchange_emp_active_sts = 1 \
					and custrecord_hris_empchange_emp_pay_pro_gp= " + paygrpName + " and custrecord_hris_empchange_subsidiary =" +subsidiary+" and b.isinactive ='F' \
					GROUP BY a.custrecord_hris_empchange_employee_nam,a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join ";
			log.debug("sqlemp",sqlemp);
			var queryRes =  query.runSuiteQL({ query: sqlemp });
			empResult = queryRes.asMappedResults();


			if (empResult.length > 0) {
				
				for (var loop =0; loop < empResult.length; loop++) {
					var emprow = empResult[loop];
					var doj = emprow.custrecord_hris_empchange_date_of_join;
					//log.debug("getEmployee : doj",doj);
					if (period >= doj) 
					{
						Count = Count+1;
						
					}
					
				}
			}
			
			log.debug("getEmployee : Count",Count);
			return Count;		
					


        }

        function getPayfrequency(paygrpid) {
            
			var SeqNo =0;
			var sqlPayfrq = "select A.name as processgrpname,b.name as payfrequency,A.custrecord_hris__currency as processcurrency,custrecord_hris__sequence_no as freqseqno from customrecord_hris_process_groupmaster A inner join customrecord_hris_pay_process_frequency B on A.custrecord_hris_pay_process_frequency = B.id where A.id = " + paygrpid;
			log.debug('sqlPayfrq',sqlPayfrq);
			var PayfrqQueryResult =  query.runSuiteQL({ query: sqlPayfrq });
			var PayfrqResult = PayfrqQueryResult.asMappedResults();
			if (PayfrqResult.length > 0) {
				for (var loop =0; loop < PayfrqResult.length; loop++) {
					var paygrprow = PayfrqResult[loop];
					SeqNo  = paygrprow.freqseqno;
				}
			}
			log.audit("Payseqno",SeqNo);
			return SeqNo;

        }

        function searchPayFrq(payfreq) {
            // Add your logic for searchPayFrq function here
        }

        function _logValidation(value) {
            return (value !== 'null' && value !== null && value !== '' && value !== undefined && value !== 'undefined' && !isNaN(value));
        }

        return {
            onRequest: onRequest
        };
    }
);
